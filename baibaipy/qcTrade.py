from AlgorithmImports import *

class UVIXShortStrategy(QCAlgorithm):

    def Initialize(self):
        self.SetStartDate(2020, 1, 1)
        self.SetEndDate(2025, 8, 31)
        self.SetCash(100000)

        # 添加UVIX和SQQQ
        self.uvix = self.AddEquity("UVIX", Resolution.Minute).Symbol
        self.sqqq = self.AddEquity("SQQQ", Resolution.Minute).Symbol

        # 添加期权
        uvix_option = self.AddOption("UVIX", Resolution.Minute)
        uvix_option.SetFilter(-2, 2, 0, 45)
        self.uvix_option = uvix_option.Symbol

        sqqq_option = self.AddOption("SQQQ", Resolution.Minute)
        sqqq_option.SetFilter(-2, 2, 0, 45)
        self.sqqq_option = sqqq_option.Symbol

        # 添加VIX期货作为市场恐慌指标
        self.vix = self.AddIndex("VIX", Resolution.Daily).Symbol

        # 添加SPY作为市场基准
        self.spy = self.AddEquity("SPY", Resolution.Daily).Symbol

        # 所有做空标的列表
        self.short_symbols = {
            self.uvix: "UVIX",
            self.sqqq: "SQQQ"
        }

        # 策略参数
        self.leverage = 1.0
        self.rebalance_threshold = 0.05

        # 分级止损参数
        self.stop_loss_uvix = 0.12
        self.stop_loss_sqqq = 0.18

        self.vix_threshold = 30
        self.spy_drawdown_threshold = 0.05

        # 资金分配比例（动态调整）
        self.base_allocations = {
            self.uvix: 0.35,
            self.sqqq: 0.65
        }
        self.allocations = self.base_allocations.copy()

        # 动态仓位调整参数
        self.vix_low_threshold = 15
        self.vix_mid_threshold = 25
        self.uvix_alloc_low_vix = 0.40
        self.uvix_alloc_mid_vix = 0.30
        self.uvix_alloc_high_vix = 0.20

        # 状态变量
        self.entry_prices = {
            self.uvix: None,
            self.sqqq: None
        }
        self.is_stopped_out = False
        self.spy_previous_close = None
        self.spy_price_history = []
        self.cooldown_days = 5
        self.stop_date = None

        # VIX闪崩检测
        self.vix_previous_close = None
        self.vix_spike_date = None
        self.in_vix_spike_observation = False
        self.vix_spike_threshold_pct = 1.0
        self.observation_days = 2

        # 持续中等波动检测
        self.vix_history = []
        self.in_persistent_volatility_mode = False
        self.persistent_vix_low = 20
        self.persistent_vix_high = 35
        self.persistent_days_threshold = 3
        self.vix_peak_value = None

        # 快速恢复检测
        self.vix_recovery_threshold = 25
        self.vix_high_threshold = 50
        self.spy_rebound_threshold = 0.02
        self.spy_cumulative_rebound = 0.03
        self.vix_peak_drop_threshold = 0.30

        # 期权到期日卖出策略
        self.option_expiry_dates = {}
        self.expiry_day_data = {}
        self.expiry_breakout_triggered = {}
        self.market_open_time = None
        self.first_hour_end_time = None

        # 期权策略资金分配
        self.option_allocation_uvix = 0.03
        self.option_allocation_sqqq = 0.05

        # 波动率指标
        self.vix_ema = ExponentialMovingAverage(5)
        self.vix_spike_threshold = 1.5

        # 获取即将到期的期权日期
        self.Schedule.On(
            self.DateRules.EveryDay(),
            self.TimeRules.At(9, 0),
            self.CheckUpcomingExpiries
        )

        # 每日重新平衡
        self.Schedule.On(
            self.DateRules.EveryDay(self.uvix),
            self.TimeRules.AfterMarketOpen(self.uvix, 30),
            self.Rebalance
        )

        # 盘中监控
        self.Schedule.On(
            self.DateRules.EveryDay(self.uvix),
            self.TimeRules.Every(timedelta(hours=1)),
            self.MonitorIntraday
        )

    def OnData(self, data):
        # 更新VIX EMA和历史记录
        if data.ContainsKey(self.vix) and data[self.vix] is not None:
            current_vix = data[self.vix].Close
            self.vix_ema.Update(self.Time, current_vix)

            # 记录VIX历史
            self.vix_history.append({'date': self.Time.date(), 'value': current_vix})
            if len(self.vix_history) > 10:
                self.vix_history.pop(0)

            # 更新VIX峰值
            if self.vix_peak_value is None or current_vix > self.vix_peak_value:
                self.vix_peak_value = current_vix

            # 检测VIX单日暴涨
            if self.vix_previous_close is not None and self.vix_previous_close > 0:
                vix_daily_change = (current_vix - self.vix_previous_close) / self.vix_previous_close

                if vix_daily_change > self.vix_spike_threshold_pct:
                    self.in_vix_spike_observation = True
                    self.vix_spike_date = self.Time
                    self.Debug(f"[{self.Time}] *** VIX闪崩事件 *** VIX单日暴涨 {vix_daily_change:.1%} ({self.vix_previous_close:.2f} -> {current_vix:.2f})，进入{self.observation_days}天观望期")

            self.vix_previous_close = current_vix

        # 更新SPY前收盘价和历史
        if data.ContainsKey(self.spy) and data[self.spy] is not None:
            current_spy = data[self.spy].Close
            if self.spy_previous_close is None:
                self.spy_previous_close = current_spy

            self.spy_price_history.append({'date': self.Time.date(), 'price': current_spy})
            if len(self.spy_price_history) > 5:
                self.spy_price_history.pop(0)

        self.MonitorExpiryDayRanges(data)
        self.CheckExpiryDayBreakout(data)

    def Rebalance(self):
        self.CheckPersistentVolatility()
        self.AdjustAllocations()

        if self.in_vix_spike_observation and self.vix_spike_date is not None:
            days_since_spike = (self.Time - self.vix_spike_date).days
            if days_since_spike >= self.observation_days:
                self.in_vix_spike_observation = False
                self.Debug(f"[{self.Time}] VIX闪崩观望期结束，恢复正常交易")

        if self.in_vix_spike_observation:
            days_remaining = self.observation_days - (self.Time - self.vix_spike_date).days
            self.Debug(f"[{self.Time}] VIX闪崩观望期中，还剩 {days_remaining} 天")
            return

        if self.is_stopped_out and self.CheckFastRecovery():
            self.is_stopped_out = False
            self.stop_date = None
            self.Debug(f"[{self.Time}] *** 检测到快速恢复 *** 跳过冷却期，立即重新建仓")

        if self.is_stopped_out and self.stop_date is not None:
            days_since_stop = (self.Time - self.stop_date).days
            if days_since_stop < self.cooldown_days:
                self.Debug(f"[{self.Time}] 冷却期中，距离恢复还有 {self.cooldown_days - days_since_stop} 天")
                return
            else:
                self.is_stopped_out = False
                self.Debug(f"[{self.Time}] 冷却期结束，恢复做空")

        if self.DetectBlackSwan():
            has_position = any(self.Portfolio[symbol].Invested for symbol in self.short_symbols.keys())
            if has_position:
                for symbol in self.short_symbols.keys():
                    self.Liquidate(symbol)
                    self.entry_prices[symbol] = None
                self.is_stopped_out = True
                self.stop_date = self.Time
                self.Debug(f"[{self.Time}] 检测到黑天鹅事件，全部平仓")
            return

        if not self.is_stopped_out:
            for symbol, name in self.short_symbols.items():
                self.RebalanceSymbol(symbol, name)

    def CheckPersistentVolatility(self):
        if len(self.vix_history) < self.persistent_days_threshold:
            return

        recent_days = self.vix_history[-self.persistent_days_threshold:]
        all_in_range = all(self.persistent_vix_low <= day['value'] <= self.persistent_vix_high for day in recent_days)

        if all_in_range and not self.in_persistent_volatility_mode:
            self.in_persistent_volatility_mode = True
            avg_vix = sum(day['value'] for day in recent_days) / len(recent_days)
            self.Debug(f"[{self.Time}] *** 进入持续中等波动模式 *** VIX持续{self.persistent_days_threshold}天在{self.persistent_vix_low}-{self.persistent_vix_high}区间，平均VIX={avg_vix:.2f}")

        elif not all_in_range and self.in_persistent_volatility_mode:
            self.in_persistent_volatility_mode = False
            current_vix = self.vix_history[-1]['value']
            self.Debug(f"[{self.Time}] 退出持续波动模式，VIX={current_vix:.2f}")

    def AdjustAllocations(self):
        vix_value = self.Securities[self.vix].Price

        if self.in_persistent_volatility_mode:
            uvix_alloc = 0.25
            sqqq_alloc = 0.75
            vix_level = "持续波动"
        elif vix_value < self.vix_low_threshold:
            uvix_alloc = self.uvix_alloc_low_vix
            vix_level = "低"
        elif vix_value < self.vix_mid_threshold:
            uvix_alloc = self.uvix_alloc_mid_vix
            vix_level = "中"
        else:
            uvix_alloc = self.uvix_alloc_high_vix
            vix_level = "高"

        sqqq_alloc = 1.0 - uvix_alloc

        if self.allocations[self.uvix] != uvix_alloc:
            self.allocations[self.uvix] = uvix_alloc
            self.allocations[self.sqqq] = sqqq_alloc
            self.Debug(f"[{self.Time}] 动态调整仓位: VIX={vix_value:.2f}({vix_level}位), UVIX={uvix_alloc:.0%}, SQQQ={sqqq_alloc:.0%}")

    def RebalanceSymbol(self, symbol, name):
        current_price = self.Securities[symbol].Price

        if current_price <= 0:
            return

        allocation = self.allocations[symbol]
        target_value = self.Portfolio.TotalPortfolioValue * allocation * self.leverage
        target_shares = -int(target_value / current_price)

        current_shares = self.Portfolio[symbol].Quantity

        if current_shares == 0:
            if target_shares != 0:
                self.MarketOrder(symbol, target_shares)
                self.entry_prices[symbol] = current_price
                self.Debug(f"[{self.Time}] 开仓做空 {abs(target_shares)} 股 {name} @ ${current_price:.2f}")
            return

        if target_shares == 0:
            deviation = 1.0
        else:
            deviation = abs(current_shares - target_shares) / abs(target_shares)

        if deviation > self.rebalance_threshold:
            shares_diff = target_shares - current_shares
            self.MarketOrder(symbol, shares_diff)
            self.entry_prices[symbol] = current_price
            self.Debug(f"[{self.Time}] {name} 调仓: 偏离{deviation:.1%}，从 {current_shares} 股调整到 {target_shares} 股")
        else:
            if self.Time.hour == 10 and self.Time.minute == 0:
                self.Debug(f"[{self.Time}] {name} 持仓偏离{deviation:.1%}，维持现有仓位")

    def MonitorIntraday(self):
        has_position = any(self.Portfolio[symbol].Invested for symbol in self.short_symbols.keys())
        if not has_position:
            return

        for symbol, name in self.short_symbols.items():
            if self.Portfolio[symbol].Invested:
                self.CheckStopLoss(symbol, name)

    def CheckStopLoss(self, symbol, name):
        entry_price = self.entry_prices[symbol]
        if entry_price is None:
            return

        current_price = self.Securities[symbol].Price

        if current_price > 0:
            unrealized_loss = (current_price - entry_price) / entry_price

            if symbol == self.uvix:
                stop_loss_threshold = 0.15 if self.in_persistent_volatility_mode else self.stop_loss_uvix
            else:
                stop_loss_threshold = self.stop_loss_sqqq

            if unrealized_loss > stop_loss_threshold:
                self.Liquidate(symbol)
                self.is_stopped_out = True
                self.stop_date = self.Time
                self.entry_prices[symbol] = None
                mode_info = " [持续波动模式]" if self.in_persistent_volatility_mode else ""
                self.Debug(f"[{self.Time}] {name} 触发止损（止损线{stop_loss_threshold:.0%}{mode_info}），亏损 {unrealized_loss:.2%}，平仓")

    def DetectBlackSwan(self):
        signals = []

        if self.Securities[self.vix].Price > self.vix_threshold:
            signals.append("VIX高位")

        if self.vix_ema.IsReady:
            current_vix = self.Securities[self.vix].Price
            vix_ema_value = self.vix_ema.Current.Value

            if current_vix > vix_ema_value * self.vix_spike_threshold:
                signals.append("VIX急涨")

        if self.spy_previous_close is not None:
            spy_current = self.Securities[self.spy].Price
            spy_return = (spy_current - self.spy_previous_close) / self.spy_previous_close

            if spy_return < -self.spy_drawdown_threshold:
                signals.append(f"SPY暴跌{spy_return:.2%}")

            self.spy_previous_close = spy_current

        if len(signals) >= 2:
            self.Debug(f"[{self.Time}] 黑天鹅信号: {', '.join(signals)}")
            return True

        return False

    def CheckFastRecovery(self):
        if self.stop_date is None:
            return False

        current_vix = self.Securities[self.vix].Price
        current_spy = self.Securities[self.spy].Price

        vix_peak_recovery = False
        if self.vix_peak_value and self.vix_peak_value > 0:
            vix_drop_pct = (self.vix_peak_value - current_vix) / self.vix_peak_value
            if vix_drop_pct > self.vix_peak_drop_threshold:
                vix_peak_recovery = True
                self.Debug(f"[{self.Time}] 快速恢复条件1满足: VIX从峰值{self.vix_peak_value:.2f}回落{vix_drop_pct:.1%}到{current_vix:.2f}")

        vix_recovered = current_vix < self.vix_recovery_threshold
        spy_single_day_rebound = False
        if self.spy_previous_close is not None and self.spy_previous_close > 0:
            spy_change = (current_spy - self.spy_previous_close) / self.spy_previous_close
            if spy_change > self.spy_rebound_threshold:
                spy_single_day_rebound = True

        condition2 = vix_recovered and spy_single_day_rebound
        if condition2:
            self.Debug(f"[{self.Time}] 快速恢复条件2满足: VIX={current_vix:.2f}, SPY单日反弹={((current_spy - self.spy_previous_close) / self.spy_previous_close):.2%}")

        spy_cumulative_rebound = False
        if len(self.spy_price_history) >= 4:
            spy_3days_ago = self.spy_price_history[-4]['price']
            spy_cumulative_change = (current_spy - spy_3days_ago) / spy_3days_ago
            if vix_recovered and spy_cumulative_change > self.spy_cumulative_rebound:
                spy_cumulative_rebound = True
                self.Debug(f"[{self.Time}] 快速恢复条件3满足: VIX={current_vix:.2f}, SPY累计3日反弹={spy_cumulative_change:.2%}")

        if vix_peak_recovery or condition2 or spy_cumulative_rebound:
            self.vix_peak_value = current_vix
            return True

        return False

    def CheckUpcomingExpiries(self):
        today = self.Time.date()

        if today not in self.option_expiry_dates:
            self.expiry_day_data[self.uvix] = None
            self.expiry_day_data[self.sqqq] = None
            self.expiry_breakout_triggered[self.uvix] = False
            self.expiry_breakout_triggered[self.sqqq] = False

    def MonitorExpiryDayRanges(self, data):
        if self.Time.hour == 9 and self.Time.minute == 30:
            self.market_open_time = self.Time
            self.first_hour_end_time = self.Time + timedelta(hours=1)

            if self.IsOptionsExpiryDay():
                self.Debug(f"[{self.Time}] *** 期权到期日 *** 开始记录开盘一小时高低点")
                self.expiry_day_data[self.uvix] = {'high': None, 'low': None, 'monitoring': True}
                self.expiry_day_data[self.sqqq] = {'high': None, 'low': None, 'monitoring': True}
                self.expiry_breakout_triggered[self.uvix] = False
                self.expiry_breakout_triggered[self.sqqq] = False

        if self.market_open_time and self.Time <= self.first_hour_end_time:
            for symbol in [self.uvix, self.sqqq]:
                if symbol in self.expiry_day_data and self.expiry_day_data[symbol] and self.expiry_day_data[symbol]['monitoring']:
                    if data.ContainsKey(symbol) and data[symbol] is not None:
                        price = data[symbol].Close

                        if self.expiry_day_data[symbol]['high'] is None:
                            self.expiry_day_data[symbol]['high'] = price
                            self.expiry_day_data[symbol]['low'] = price
                        else:
                            self.expiry_day_data[symbol]['high'] = max(self.expiry_day_data[symbol]['high'], price)
                            self.expiry_day_data[symbol]['low'] = min(self.expiry_day_data[symbol]['low'], price)

        if self.first_hour_end_time and self.Time.hour == 10 and self.Time.minute == 30:
            for symbol in [self.uvix, self.sqqq]:
                if symbol in self.expiry_day_data and self.expiry_day_data[symbol] and self.expiry_day_data[symbol]['monitoring']:
                    data_point = self.expiry_day_data[symbol]
                    name = "UVIX" if symbol == self.uvix else "SQQQ"
                    if data_point['high'] and data_point['low']:
                        self.Debug(f"[{self.Time}] {name} 开盘一小时范围: 最高 ${data_point['high']:.2f}, 最低 ${data_point['low']:.2f}")
                        data_point['monitoring'] = False

    def CheckExpiryDayBreakout(self, data):
        if not self.first_hour_end_time or self.Time <= self.first_hour_end_time:
            return

        for symbol in [self.uvix, self.sqqq]:
            if self.expiry_breakout_triggered.get(symbol, False):
                continue

            if symbol not in self.expiry_day_data or not self.expiry_day_data[symbol]:
                continue

            data_point = self.expiry_day_data[symbol]
            if data_point['high'] is None or data_point['low'] is None:
                continue

            if not data.ContainsKey(symbol) or data[symbol] is None:
                continue

            current_price = data[symbol].Close
            name = "UVIX" if symbol == self.uvix else "SQQQ"
            option_symbol = self.uvix_option if symbol == self.uvix else self.sqqq_option

            if current_price < data_point['low']:
                self.Debug(f"[{self.Time}] {name} 向下突破最低点 ${data_point['low']:.2f} (当前${current_price:.2f}), 卖出Call")
                self.SellOptionNearStrike(option_symbol, data_point['high'], OptionRight.Call, name)
                self.expiry_breakout_triggered[symbol] = True

            elif current_price > data_point['high']:
                self.Debug(f"[{self.Time}] {name} 向上突破最高点 ${data_point['high']:.2f} (当前${current_price:.2f}), 卖出Put")
                self.SellOptionNearStrike(option_symbol, data_point['low'], OptionRight.Put, name)
                self.expiry_breakout_triggered[symbol] = True

    def IsOptionsExpiryDay(self):
        today = self.Time.date()

        if today.weekday() != 4:
            return False

        first_day = today.replace(day=1)
        first_friday = first_day + timedelta(days=(4 - first_day.weekday()) % 7)
        third_friday = first_friday + timedelta(weeks=2)

        return today == third_friday

    def SellOptionNearStrike(self, option_symbol, target_strike, option_right, underlying_name):
        option_chain = self.CurrentSlice.OptionChains.get(option_symbol)
        if option_chain is None or len(option_chain) == 0:
            self.Debug(f"[{self.Time}] {underlying_name} 期权链为空，无法卖出")
            return

        options = [x for x in option_chain if x.Right == option_right]
        if len(options) == 0:
            self.Debug(f"[{self.Time}] {underlying_name} 没有找到{option_right}期权")
            return

        options = sorted(options, key=lambda x: abs(x.Strike - target_strike))
        selected_option = options[0]

        underlying_symbol = self.uvix if underlying_name == "UVIX" else self.sqqq
        option_allocation = self.option_allocation_uvix if underlying_symbol == self.uvix else self.option_allocation_sqqq

        account_value = self.Portfolio.TotalPortfolioValue
        allocation_value = account_value * option_allocation

        option_price = selected_option.BidPrice if selected_option.BidPrice > 0 else selected_option.LastPrice

        if option_price <= 0:
            self.Debug(f"[{self.Time}] {underlying_name} 期权价格无效")
            return

        contracts = int(allocation_value / (option_price * 100))
        contracts = max(1, min(contracts, 10))

        self.MarketOrder(selected_option.Symbol, -contracts)

        option_type = "Call" if option_right == OptionRight.Call else "Put"
        premium = option_price * 100 * contracts
        self.Debug(f"[{self.Time}] 卖出 {contracts} 张 {underlying_name} {option_type}, 行权价 ${selected_option.Strike:.2f}, 权利金约 ${premium:.2f}")

    def OnEndOfDay(self):
        has_position = any(self.Portfolio[symbol].Invested for symbol in self.short_symbols.keys())

        option_positions = []
        option_pnl = 0
        for kvp in self.Portfolio:
            security = kvp.Value
            if security.Invested and security.Type == SecurityType.Option:
                option_pnl += security.Holdings.UnrealizedProfit
                option_positions.append({'symbol': security.Symbol, 'quantity': security.Holdings.Quantity, 'pnl': security.Holdings.UnrealizedProfit})

        if has_position:
            total_pnl = 0
            for symbol, name in self.short_symbols.items():
                if self.Portfolio[symbol].Invested:
                    pnl = self.Portfolio[symbol].UnrealizedProfit
                    total_pnl += pnl
                    self.Debug(f"[{self.Time.date()}] {name}持仓: {self.Portfolio[symbol].Quantity} 股, 盈亏: ${pnl:.2f}")

            if len(option_positions) > 0:
                self.Debug(f"[{self.Time.date()}] 期权持仓数: {len(option_positions)}, 期权盈亏: ${option_pnl:.2f}")
                total_pnl += option_pnl

            self.Debug(f"[{self.Time.date()}] 总盈亏: ${total_pnl:.2f}, 账户: ${self.Portfolio.TotalPortfolioValue:.2f}")
        elif len(option_positions) > 0:
            self.Debug(f"[{self.Time.date()}] 仅持有期权: {len(option_positions)} 个, 盈亏: ${option_pnl:.2f}")
            self.Debug(f"[{self.Time.date()}] 账户: ${self.Portfolio.TotalPortfolioValue:.2f}")