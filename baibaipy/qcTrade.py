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
        # 扩大过滤范围：行权价±5档，60天内到期
        uvix_option.SetFilter(-5, 5, 0, 60)
        self.uvix_option = uvix_option.Symbol

        sqqq_option = self.AddOption("SQQQ", Resolution.Minute)
        sqqq_option.SetFilter(-5, 5, 0, 60)
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

        # ========== 修改后的期权策略 ==========
        # 每月卖出当月到期的Put期权（月度期权）
        self.options_sold_this_month = False  # 记录本月是否已卖出期权
        self.last_option_month = None  # 记录上次卖出期权的月份

        # 期权策略：不再使用资金分配比例
        # 改为根据做空数量决定：张数 = 做空数量 / 200

        # 波动率指标
        self.vix_ema = ExponentialMovingAverage(5)
        self.vix_spike_threshold = 1.5

        # ========== 修改后的定时任务 ==========
        # 每月第一个交易日10:00：卖出当月到期的Put期权
        self.Schedule.On(
            self.DateRules.MonthStart(self.uvix),
            self.TimeRules.AfterMarketOpen(self.uvix, 30),
            self.SellMonthlyPuts
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

    # ========== 新的期权策略方法 ==========

    def SellMonthlyPuts(self):
        """每月初卖出当月到期的Put期权"""
        current_month = self.Time.date().replace(day=1)

        # 检查本月是否已经卖过
        if self.last_option_month == current_month:
            self.Debug(f"[{self.Time}] 本月已卖出期权，跳过")
            return

        self.Debug(f"[{self.Time}] ========== 每月期权策略 ==========")
        self.Debug(f"[{self.Time}] 当前日期: {self.Time.date()}")

        # 先检查期权链数据
        self.DebugAllOptionExpiries()

        # 找到最近的到期日（通常是本月第三个周五）
        nearest_expiry = self.FindNearestExpiry()

        if nearest_expiry is None:
            self.Debug(f"[{self.Time}] 没有找到可用的期权到期日")
            return

        self.Debug(f"[{self.Time}] 选择到期日: {nearest_expiry}")

        # 对UVIX和SQQQ分别卖出期权
        for symbol in [self.uvix, self.sqqq]:
            name = "UVIX" if symbol == self.uvix else "SQQQ"
            self.SellPutForSymbol(symbol, name, nearest_expiry)

        self.last_option_month = current_month

    def FindNearestExpiry(self):
        """找到最近的期权到期日"""
        today = self.Time.date()

        # 收集所有可用的到期日
        all_expiries = set()

        uvix_chain = self.CurrentSlice.OptionChains.get(self.uvix_option)
        if uvix_chain:
            all_expiries.update(x.Expiry.date() for x in uvix_chain)

        sqqq_chain = self.CurrentSlice.OptionChains.get(self.sqqq_option)
        if sqqq_chain:
            all_expiries.update(x.Expiry.date() for x in sqqq_chain)

        if not all_expiries:
            return None

        # 找到最近的未来到期日
        future_expiries = [d for d in all_expiries if d >= today]

        if not future_expiries:
            return None

        return min(future_expiries)

    def DebugAllOptionExpiries(self):
        """输出当前可用的所有期权到期日"""
        self.Debug(f"[{self.Time}] === 检查期权链所有到期日 ===")

        uvix_chain = self.CurrentSlice.OptionChains.get(self.uvix_option)
        sqqq_chain = self.CurrentSlice.OptionChains.get(self.sqqq_option)

        if uvix_chain and len(uvix_chain) > 0:
            uvix_expiries = sorted(set(x.Expiry.date() for x in uvix_chain))
            self.Debug(f"[{self.Time}] UVIX期权链: {len(uvix_chain)} 个合约")
            self.Debug(f"[{self.Time}] UVIX可用到期日: {uvix_expiries}")

            # 统计每个到期日的Put数量
            for expiry in uvix_expiries:
                puts_count = len([x for x in uvix_chain if x.Expiry.date() == expiry and x.Right == OptionRight.Put])
                self.Debug(f"[{self.Time}]   {expiry}: {puts_count} 个Put期权")
        else:
            self.Debug(f"[{self.Time}] UVIX期权链: 无数据")

        if sqqq_chain and len(sqqq_chain) > 0:
            sqqq_expiries = sorted(set(x.Expiry.date() for x in sqqq_chain))
            self.Debug(f"[{self.Time}] SQQQ期权链: {len(sqqq_chain)} 个合约")
            self.Debug(f"[{self.Time}] SQQQ可用到期日: {sqqq_expiries}")

            for expiry in sqqq_expiries:
                puts_count = len([x for x in sqqq_chain if x.Expiry.date() == expiry and x.Right == OptionRight.Put])
                self.Debug(f"[{self.Time}]   {expiry}: {puts_count} 个Put期权")
        else:
            self.Debug(f"[{self.Time}] SQQQ期权链: 无数据")

    def SellPutForSymbol(self, underlying_symbol, name, target_expiry):
        """为指定标的卖出Put期权"""
        # 检查是否有做空仓位
        if not self.Portfolio[underlying_symbol].Invested:
            self.Debug(f"[{self.Time}] {name} 没有做空仓位，跳过期权交易")
            return

        short_quantity = abs(self.Portfolio[underlying_symbol].Quantity)
        current_price = self.Securities[underlying_symbol].Price

        if current_price <= 0:
            self.Debug(f"[{self.Time}] {name} 价格无效，跳过")
            return

        # 计算合约数量：做空数量 / 200
        contracts = int(short_quantity / 200)

        if contracts < 1:
            self.Debug(f"[{self.Time}] {name} 做空数量 {short_quantity} 不足200股，跳过期权交易")
            return

        # 目标行权价：当前价格的85%
        target_strike = current_price * 0.85

        self.Debug(f"[{self.Time}] {name} 做空仓位: {short_quantity} 股")
        self.Debug(f"[{self.Time}] {name} 当前价格: ${current_price:.2f}")
        self.Debug(f"[{self.Time}] {name} 目标行权价: ${target_strike:.2f} (85%)")
        self.Debug(f"[{self.Time}] {name} 计划卖出: {contracts} 张Put")

        # 获取期权链
        option_symbol = self.uvix_option if underlying_symbol == self.uvix else self.sqqq_option
        option_chain = self.CurrentSlice.OptionChains.get(option_symbol)

        if option_chain is None:
            self.Debug(f"[{self.Time}] {name} 期权链为None")
            return

        if len(option_chain) == 0:
            self.Debug(f"[{self.Time}] {name} 期权链为空")
            return

        self.Debug(f"[{self.Time}] {name} 期权链有 {len(option_chain)} 个合约")

        # 筛选Put期权
        puts = [x for x in option_chain if x.Right == OptionRight.Put]

        if len(puts) == 0:
            self.Debug(f"[{self.Time}] {name} 没有Put期权")
            return

        # 筛选目标到期日的期权
        target_puts = [x for x in puts if x.Expiry.date() == target_expiry]

        if len(target_puts) == 0:
            self.Debug(f"[{self.Time}] {name} 没有找到 {target_expiry} 到期的Put期权，跳过交易")
            return

        self.Debug(f"[{self.Time}] {name} 找到 {len(target_puts)} 个目标到期日的Put期权")

        # 选择行权价最接近目标的期权
        selected_option = min(target_puts, key=lambda x: abs(x.Strike - target_strike))

        self.Debug(f"[{self.Time}] {name} 选中期权: 行权价=${selected_option.Strike:.2f}, 到期={selected_option.Expiry.date()}")

        # 获取期权价格
        option_price = selected_option.BidPrice if selected_option.BidPrice > 0 else selected_option.LastPrice

        if option_price <= 0:
            self.Debug(f"[{self.Time}] {name} 期权价格无效: Bid=${selected_option.BidPrice:.2f}, Last=${selected_option.LastPrice:.2f}")
            return

        # 卖出期权
        self.MarketOrder(selected_option.Symbol, -contracts)

        premium = option_price * 100 * contracts

        self.Debug(f"[{self.Time}] *** [{name} 期权成交] ***")
        self.Debug(f"[{self.Time}] 卖出 {contracts} 张 Put")
        self.Debug(f"[{self.Time}] 行权价: ${selected_option.Strike:.2f} (目标: ${target_strike:.2f})")
        self.Debug(f"[{self.Time}] 到期日: {selected_option.Expiry.date()}")
        self.Debug(f"[{self.Time}] 期权价格: ${option_price:.2f}")
        self.Debug(f"[{self.Time}] 收取权利金: ${premium:.2f}")
        self.Debug(f"[{self.Time}] 如被行权: 将以 ${selected_option.Strike:.2f} 接盘 {contracts*100} 股")

    def OnEndOfDay(self, symbol):
        """每日结束时输出持仓信息"""
        # 只在主要标的结束时执行一次
        if symbol != self.uvix:
            return

        has_position = any(self.Portfolio[s].Invested for s in self.short_symbols.keys())

        option_positions = []
        option_pnl = 0
        for kvp in self.Portfolio:
            security = kvp.Value
            # 直接使用security而不是security.Holdings
            if security.Invested and security.Type == SecurityType.Option:
                option_pnl += security.UnrealizedProfit
                option_positions.append({
                    'symbol': security.Symbol,
                    'quantity': security.Quantity,
                    'pnl': security.UnrealizedProfit,
                    'avg_price': security.AveragePrice,
                    'current_price': security.Price
                })

        if has_position:
            total_pnl = 0
            for sym, name in self.short_symbols.items():
                if self.Portfolio[sym].Invested:
                    pnl = self.Portfolio[sym].UnrealizedProfit
                    total_pnl += pnl
                    self.Debug(f"[{self.Time.date()}] {name}持仓: {self.Portfolio[sym].Quantity} 股, 盈亏: ${pnl:.2f}")

            if len(option_positions) > 0:
                self.Debug(f"[{self.Time.date()}] ========== 期权持仓详情 ==========")
                for i, opt in enumerate(option_positions, 1):
                    opt_symbol = opt['symbol']
                    # 解析期权信息
                    underlying = "UVIX" if "UVIX" in str(opt_symbol) else "SQQQ"

                    # 尝试获取期权属性
                    try:
                        opt_contract = self.Securities[opt_symbol]
                        strike = opt_contract.StrikePrice if hasattr(opt_contract, 'StrikePrice') else "N/A"
                        expiry = opt_contract.Expiry.date() if hasattr(opt_contract, 'Expiry') else "N/A"
                        right = "Put" if hasattr(opt_contract, 'Right') and opt_contract.Right == OptionRight.Put else "Call"
                    except:
                        strike = "N/A"
                        expiry = "N/A"
                        right = "Unknown"

                    qty = opt['quantity']
                    pnl = opt['pnl']
                    avg_price = opt['avg_price']
                    current_price = opt['current_price']

                    self.Debug(f"[{self.Time.date()}] 期权{i}: {underlying} {right}")
                    self.Debug(f"[{self.Time.date()}]   行权价: ${strike}, 到期: {expiry}")
                    self.Debug(f"[{self.Time.date()}]   持仓: {qty} 张 (做空)" if qty < 0 else f"[{self.Time.date()}]   持仓: {qty} 张 (做多)")
                    self.Debug(f"[{self.Time.date()}]   开仓价: ${avg_price:.2f}, 当前价: ${current_price:.2f}")
                    self.Debug(f"[{self.Time.date()}]   盈亏: ${pnl:.2f}")

                self.Debug(f"[{self.Time.date()}] 期权总盈亏: ${option_pnl:.2f}")
                total_pnl += option_pnl

            self.Debug(f"[{self.Time.date()}] 总盈亏: ${total_pnl:.2f}, 账户: ${self.Portfolio.TotalPortfolioValue:.2f}")
        elif len(option_positions) > 0:
            self.Debug(f"[{self.Time.date()}] ========== 期权持仓详情 ==========")
            for i, opt in enumerate(option_positions, 1):
                opt_symbol = opt['symbol']
                underlying = "UVIX" if "UVIX" in str(opt_symbol) else "SQQQ"

                try:
                    opt_contract = self.Securities[opt_symbol]
                    strike = opt_contract.StrikePrice if hasattr(opt_contract, 'StrikePrice') else "N/A"
                    expiry = opt_contract.Expiry.date() if hasattr(opt_contract, 'Expiry') else "N/A"
                    right = "Put" if hasattr(opt_contract, 'Right') and opt_contract.Right == OptionRight.Put else "Call"
                except:
                    strike = "N/A"
                    expiry = "N/A"
                    right = "Unknown"

                qty = opt['quantity']
                pnl = opt['pnl']
                avg_price = opt['avg_price']
                current_price = opt['current_price']

                self.Debug(f"[{self.Time.date()}] 期权{i}: {underlying} {right}")
                self.Debug(f"[{self.Time.date()}]   行权价: ${strike}, 到期: {expiry}")
                self.Debug(f"[{self.Time.date()}]   持仓: {qty} 张 (做空)" if qty < 0 else f"[{self.Time.date()}]   持仓: {qty} 张 (做多)")
                self.Debug(f"[{self.Time.date()}]   开仓价: ${avg_price:.2f}, 当前价: ${current_price:.2f}")
                self.Debug(f"[{self.Time.date()}]   盈亏: ${pnl:.2f}")

            self.Debug(f"[{self.Time.date()}] 期权总盈亏: ${option_pnl:.2f}")
            self.Debug(f"[{self.Time.date()}] 账户: ${self.Portfolio.TotalPortfolioValue:.2f}")