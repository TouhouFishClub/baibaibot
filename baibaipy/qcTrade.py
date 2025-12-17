from AlgorithmImports import *

class UVIXShortStrategy(QCAlgorithm):

    def Initialize(self):
        self.SetStartDate(2020, 1, 1)
        self.SetEndDate(2025, 8, 31)
        self.SetCash(100000)

        # 添加标的
        self.uvix = self.AddEquity("UVIX", Resolution.Minute).Symbol
        self.sqqq = self.AddEquity("SQQQ", Resolution.Minute).Symbol

        # 添加期权
        uvix_option = self.AddOption("UVIX", Resolution.Minute)
        uvix_option.SetFilter(-5, 5, 0, 60)
        self.uvix_option = uvix_option.Symbol

        sqqq_option = self.AddOption("SQQQ", Resolution.Minute)
        sqqq_option.SetFilter(-5, 5, 0, 60)
        self.sqqq_option = sqqq_option.Symbol

        # 添加指标
        self.vix = self.AddIndex("VIX", Resolution.Daily).Symbol
        self.spy = self.AddEquity("SPY", Resolution.Daily).Symbol

        # ========== 交易标的开关 ==========
        self.enable_uvix_trading = True  # ✅ 已改为True

        # 根据开关设置交易标的
        if self.enable_uvix_trading:
            self.short_symbols = {self.uvix: "UVIX", self.sqqq: "SQQQ"}
        else:
            self.short_symbols = {self.sqqq: "SQQQ"}

        # 核心参数
        self.leverage = 1.0
        self.rebalance_threshold = 0.05
        self.stop_loss_uvix = 0.08
        self.stop_loss_sqqq = 0.12
        self.vix_threshold = 30
        self.spy_drawdown_threshold = 0.05

        # 资金分配（动态调整）
        self.base_allocations = {self.uvix: 0.35, self.sqqq: 0.65}
        self.allocations = self.base_allocations.copy()

        # VIX档位与分配比例
        self.vix_low_threshold = 15
        self.vix_mid_threshold = 25
        self.uvix_alloc_low_vix = 0.35
        self.uvix_alloc_mid_vix = 0.25
        self.uvix_alloc_high_vix = 0.15
        self.sqqq_alloc_low_vix = 0.65
        self.sqqq_alloc_mid_vix = 0.75
        self.sqqq_alloc_high_vix = 0.85

        # 状态变量
        self.entry_prices = {self.uvix: None, self.sqqq: None}
        self.is_stopped_out = False
        self.spy_previous_close = None
        self.spy_price_history = []

        # ========== 递进式冷却期 ==========
        self.cooldown_days = 2
        self.stop_date = None
        self.stop_history = []
        self.base_cooldown = 2
        self.cooldown_level_2 = 3
        self.cooldown_level_3 = 4
        self.max_cooldown = 5
        self.cooldown_tracking_days = 10

        # VIX闪崩检测
        self.vix_previous_close = None
        self.vix_spike_date = None
        self.in_vix_spike_observation = False
        self.vix_spike_threshold_pct = 1.0
        self.observation_days = 2

        # 持续波动检测
        self.vix_history = []
        self.in_persistent_volatility_mode = False
        self.persistent_vix_low = 20
        self.persistent_vix_high = 35
        self.persistent_days_threshold = 3
        self.persistent_uvix_alloc = 0.25
        self.persistent_sqqq_alloc = 0.75
        self.vix_peak_value = None

        # 快速恢复参数
        self.vix_recovery_threshold = 25
        self.spy_rebound_threshold = 0.02
        self.spy_cumulative_rebound = 0.03
        self.vix_peak_drop_threshold = 0.30

        # 期权策略
        self.last_option_month = None

        # 波动率指标
        self.vix_ema = ExponentialMovingAverage(5)
        self.vix_spike_threshold = 1.5

        # ========== 限价单参数 ==========
        self.limit_order_tickets = {}
        self.limit_order_premium = 0.002  # 溢价0.2%
        self.limit_order_duration_minutes = 27

        # ========== 定时任务 ==========
        # 开盘后3分钟:检查偏差并挂限价单
        self.Schedule.On(
            self.DateRules.EveryDay(self.sqqq),
            self.TimeRules.AfterMarketOpen(self.sqqq, 3),
            self.CheckDeviationAndPlaceLimitOrders
        )

        # 开盘后30分钟:检查限价单,未成交则用市价单
        self.Schedule.On(
            self.DateRules.EveryDay(self.sqqq),
            self.TimeRules.AfterMarketOpen(self.sqqq, 30),
            self.ExecuteFallbackMarketOrders
        )

        # 收盘前30分钟:再次检查偏差,超过5%挂限价单(不用市价单)
        self.Schedule.On(
            self.DateRules.EveryDay(self.sqqq),
            self.TimeRules.BeforeMarketClose(self.sqqq, 30),
            self.PreCloseRebalanceCheck
        )

        # 每月第一个交易日10:00:卖出当月到期的Put期权
        self.Schedule.On(
            self.DateRules.MonthStart(self.sqqq),
            self.TimeRules.AfterMarketOpen(self.sqqq, 30),
            self.SellMonthlyPuts
        )

        # 盘中监控
        self.Schedule.On(
            self.DateRules.EveryDay(self.sqqq),
            self.TimeRules.Every(timedelta(hours=1)),
            self.MonitorIntraday
        )

    def OnData(self, data):
        # 更新VIX数据
        if data.ContainsKey(self.vix) and data[self.vix] is not None:
            current_vix = data[self.vix].Close
            self.vix_ema.Update(self.Time, current_vix)

            self.vix_history.append({'date': self.Time.date(), 'value': current_vix})
            if len(self.vix_history) > 10:
                self.vix_history.pop(0)

            if self.vix_peak_value is None or current_vix > self.vix_peak_value:
                self.vix_peak_value = current_vix

            # VIX闪崩检测
            if self.vix_previous_close is not None and self.vix_previous_close > 0:
                vix_daily_change = (current_vix - self.vix_previous_close) / self.vix_previous_close
                if vix_daily_change > self.vix_spike_threshold_pct:
                    self.in_vix_spike_observation = True
                    self.vix_spike_date = self.Time
                    self.Debug(f"[{self.Time}] *** VIX闪崩 *** 暴涨{vix_daily_change:.1%}，进入{self.observation_days}天观望期")

            self.vix_previous_close = current_vix

        # 更新SPY数据
        if data.ContainsKey(self.spy) and data[self.spy] is not None:
            current_spy = data[self.spy].Close
            if self.spy_previous_close is None:
                self.spy_previous_close = current_spy

            self.spy_price_history.append({'date': self.Time.date(), 'price': current_spy})
            if len(self.spy_price_history) > 5:
                self.spy_price_history.pop(0)

    # ========== 限价单逻辑 ==========
    def CheckDeviationAndPlaceLimitOrders(self):
        """开盘后3分钟:检查偏差并挂限价单"""
        self.CheckPersistentVolatility()
        self.AdjustAllocations()

        # 检查观望期
        if self.in_vix_spike_observation and self.vix_spike_date is not None:
            days_since_spike = (self.Time - self.vix_spike_date).days
            if days_since_spike >= self.observation_days:
                self.in_vix_spike_observation = False
                self.Debug(f"[{self.Time}] ✓ VIX观望期结束")

        if self.in_vix_spike_observation:
            return

        # 检查快速恢复
        if self.is_stopped_out and self.CheckFastRecovery():
            self.is_stopped_out = False
            self.stop_date = None
            self.Debug(f"[{self.Time}] *** 快速恢复 *** 跳过冷却期")

        # 检查冷却期
        if self.is_stopped_out and self.stop_date is not None:
            days_since_stop = (self.Time - self.stop_date).days
            if days_since_stop < self.cooldown_days:
                return
            else:
                self.is_stopped_out = False
                self.Debug(f"[{self.Time}] ✓ 冷却期结束")
                self.CheckCooldownReset()

        # 检查黑天鹅
        if self.DetectBlackSwan():
            has_position = any(self.Portfolio[s].Invested for s in self.short_symbols.keys())
            if has_position:
                for symbol in self.short_symbols.keys():
                    self.Liquidate(symbol)
                    self.entry_prices[symbol] = None
                self.is_stopped_out = True
                self.stop_date = self.Time
                new_cooldown = self.CalculateCooldownPeriod()
                self.cooldown_days = new_cooldown
                self.stop_history.append({'date': self.Time, 'cooldown_days': new_cooldown})
                self.Debug(f"[{self.Time}] 黑天鹅事件，全部平仓 [冷却{new_cooldown}天]")
            return

        # 挂限价单
        if not self.is_stopped_out:
            for symbol, name in self.short_symbols.items():
                self.CheckDeviationAndPlaceLimitOrder(symbol, name)

    def CheckDeviationAndPlaceLimitOrder(self, symbol, name):
        """检查偏差并挂限价单"""
        current_price = self.Securities[symbol].Price
        if current_price <= 0:
            return

        allocation = self.allocations[symbol]
        target_value = self.Portfolio.TotalPortfolioValue * allocation * self.leverage
        target_shares = -int(target_value / current_price)
        current_shares = self.Portfolio[symbol].Quantity

        # 计算偏离度
        if target_shares == 0:
            deviation = 0 if current_shares == 0 else 1.0
        else:
            deviation = abs(current_shares - target_shares) / abs(target_shares)

        if deviation <= self.rebalance_threshold:
            return

        shares_needed = target_shares - current_shares
        if shares_needed == 0:
            return

        # 限价单（做空要更高价格）
        limit_price = round(current_price * (1 + self.limit_order_premium), 2)
        ticket = self.LimitOrder(symbol, shares_needed, limit_price)

        self.limit_order_tickets[symbol] = {
            'ticket': ticket, 'target_shares': shares_needed,
            'limit_price': limit_price, 'market_price': current_price,
            'current_shares': current_shares, 'target_total': target_shares
        }

        self.Debug(f"[{self.Time}] {name} 挂限价单: {shares_needed}股 @ ${limit_price:.2f} (偏离{deviation:.1%})")

    def ExecuteFallbackMarketOrders(self):
        """开盘后30分钟:检查限价单,未成交用市价单"""
        if not self.limit_order_tickets:
            return

        for symbol, order_info in list(self.limit_order_tickets.items()):
            ticket = order_info['ticket']
            name = self.short_symbols[symbol]

            if ticket.Status == OrderStatus.Filled:
                self.entry_prices[symbol] = ticket.AverageFillPrice
                saved = (ticket.AverageFillPrice - order_info['market_price']) * abs(order_info['target_shares'])
                self.Debug(f"[{self.Time}] ✓ {name} 限价单成交 @ ${ticket.AverageFillPrice:.2f} (省${saved:.2f})")

            elif ticket.Status in [OrderStatus.Submitted, OrderStatus.PartiallyFilled]:
                ticket.Cancel()
                filled_qty = ticket.QuantityFilled
                remaining_qty = order_info['target_shares'] - filled_qty

                if abs(remaining_qty) > 0:
                    current_price = self.Securities[symbol].Price
                    if current_price > 0:
                        self.MarketOrder(symbol, remaining_qty)
                        self.entry_prices[symbol] = current_price
                        self.Debug(f"[{self.Time}] {name} 市价单补齐: {remaining_qty}股 @ ${current_price:.2f}")

            elif ticket.Status == OrderStatus.Canceled:
                current_price = self.Securities[symbol].Price
                if current_price > 0:
                    self.MarketOrder(symbol, order_info['target_shares'])
                    self.entry_prices[symbol] = current_price

        self.limit_order_tickets.clear()

    def PreCloseRebalanceCheck(self):
        """收盘前30分钟:检查偏差,超过5%挂限价单(不用市价单)"""
        self.Debug(f"[{self.Time}] ========== 收盘前再平衡检查 ==========")

        # 如果在观望期或止损冷却期，跳过
        if self.in_vix_spike_observation or self.is_stopped_out:
            self.Debug(f"[{self.Time}] 观望期或冷却期中，跳过收盘再平衡")
            return

        # 检查每个标的的偏差，超过5%挂限价单
        for symbol, name in self.short_symbols.items():
            self.PreCloseRebalanceSymbol(symbol, name)

    def PreCloseRebalanceSymbol(self, symbol, name):
        """收盘前检查单个标的并挂限价单（不用市价单）"""
        current_price = self.Securities[symbol].Price
        if current_price <= 0:
            return

        allocation = self.allocations[symbol]
        target_value = self.Portfolio.TotalPortfolioValue * allocation * self.leverage
        target_shares = -int(target_value / current_price)
        current_shares = self.Portfolio[symbol].Quantity

        # 计算偏离度
        if target_shares == 0:
            deviation = 0 if current_shares == 0 else 1.0
        else:
            deviation = abs(current_shares - target_shares) / abs(target_shares)

        # 如果偏差超过5%，挂限价单
        if deviation > self.rebalance_threshold:
            shares_needed = target_shares - current_shares
            if shares_needed != 0:
                limit_price = round(current_price * (1 + self.limit_order_premium), 2)
                ticket = self.LimitOrder(symbol, shares_needed, limit_price)
                self.Debug(f"[{self.Time}] {name} 收盘前挂限价单: {shares_needed}股 @ ${limit_price:.2f} (偏离{deviation:.1%})")
        else:
            self.Debug(f"[{self.Time}] {name} 偏离{deviation:.1%}，无需调整")

    # ========== 风控逻辑 ==========
    def CheckPersistentVolatility(self):
        """检测持续中等波动"""
        if len(self.vix_history) < self.persistent_days_threshold:
            return

        recent_days = self.vix_history[-self.persistent_days_threshold:]
        all_in_range = all(self.persistent_vix_low <= d['value'] <= self.persistent_vix_high for d in recent_days)

        if all_in_range and not self.in_persistent_volatility_mode:
            self.in_persistent_volatility_mode = True
            avg_vix = sum(d['value'] for d in recent_days) / len(recent_days)
            self.Debug(f"[{self.Time}] *** 进入持续波动模式 *** 平均VIX={avg_vix:.2f}")
        elif not all_in_range and self.in_persistent_volatility_mode:
            self.in_persistent_volatility_mode = False

    def AdjustAllocations(self):
        """动态调整仓位"""
        vix_value = self.Securities[self.vix].Price

        if self.enable_uvix_trading:
            # UVIX交易开启
            if self.in_persistent_volatility_mode:
                uvix_alloc, sqqq_alloc, level = self.persistent_uvix_alloc, self.persistent_sqqq_alloc, "持续波动"
            elif vix_value < self.vix_low_threshold:
                uvix_alloc, sqqq_alloc, level = self.uvix_alloc_low_vix, 1.0 - self.uvix_alloc_low_vix, "低"
            elif vix_value < self.vix_mid_threshold:
                uvix_alloc, sqqq_alloc, level = self.uvix_alloc_mid_vix, 1.0 - self.uvix_alloc_mid_vix, "中"
            else:
                uvix_alloc, sqqq_alloc, level = self.uvix_alloc_high_vix, 1.0 - self.uvix_alloc_high_vix, "高"

            if self.allocations.get(self.uvix) != uvix_alloc:
                self.allocations[self.uvix] = uvix_alloc
                self.allocations[self.sqqq] = sqqq_alloc
                self.Debug(f"[{self.Time}] 调整仓位: VIX={vix_value:.2f}({level}), UVIX={uvix_alloc:.0%}, SQQQ={sqqq_alloc:.0%}")
        else:
            # UVIX交易关闭，SQQQ吸收全部
            if self.in_persistent_volatility_mode:
                sqqq_alloc, level = self.persistent_sqqq_alloc, "持续波动"
            elif vix_value < self.vix_low_threshold:
                sqqq_alloc, level = self.sqqq_alloc_low_vix, "低"
            elif vix_value < self.vix_mid_threshold:
                sqqq_alloc, level = self.sqqq_alloc_mid_vix, "中"
            else:
                sqqq_alloc, level = self.sqqq_alloc_high_vix, "高"

            if self.allocations.get(self.sqqq) != sqqq_alloc:
                self.allocations[self.sqqq] = sqqq_alloc
                self.allocations[self.uvix] = 0
                self.Debug(f"[{self.Time}] 调整仓位: VIX={vix_value:.2f}({level}), SQQQ={sqqq_alloc:.0%}")

    def MonitorIntraday(self):
        """盘中监控止损"""
        has_position = any(self.Portfolio[s].Invested for s in self.short_symbols.keys())
        if not has_position:
            return

        for symbol, name in self.short_symbols.items():
            if self.Portfolio[symbol].Invested:
                self.CheckStopLoss(symbol, name)

    def CheckStopLoss(self, symbol, name):
        """检查止损"""
        entry_price = self.entry_prices[symbol]
        if entry_price is None:
            return

        current_price = self.Securities[symbol].Price
        if current_price <= 0:
            return

        unrealized_loss = (current_price - entry_price) / entry_price

        # 根据标的和模式设置止损线
        if symbol == self.uvix:
            stop_loss_threshold = 0.15 if self.in_persistent_volatility_mode else self.stop_loss_uvix
        else:
            stop_loss_threshold = self.stop_loss_sqqq

        if unrealized_loss > stop_loss_threshold:
            self.Liquidate(symbol)
            self.is_stopped_out = True
            self.stop_date = self.Time
            self.entry_prices[symbol] = None

            new_cooldown = self.CalculateCooldownPeriod()
            self.cooldown_days = new_cooldown
            self.stop_history.append({'date': self.Time, 'cooldown_days': new_cooldown})

            self.Debug(f"[{self.Time}] {name} 止损 {unrealized_loss:.2%} [冷却{new_cooldown}天]")
            self.LogStopLossHistory()

    def DetectBlackSwan(self):
        """黑天鹅检测"""
        signals = []

        if self.Securities[self.vix].Price > self.vix_threshold:
            signals.append("VIX高位")

        if self.vix_ema.IsReady:
            current_vix = self.Securities[self.vix].Price
            if current_vix > self.vix_ema.Current.Value * self.vix_spike_threshold:
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
        """检测快速恢复"""
        if self.stop_date is None:
            return False

        current_vix = self.Securities[self.vix].Price
        current_spy = self.Securities[self.spy].Price

        # 条件1: VIX从峰值大幅回落
        vix_peak_recovery = False
        if self.vix_peak_value and self.vix_peak_value > 0:
            vix_drop = (self.vix_peak_value - current_vix) / self.vix_peak_value
            if vix_drop > self.vix_peak_drop_threshold:
                vix_peak_recovery = True

        # 条件2: VIX恢复低位 + SPY单日反弹
        vix_recovered = current_vix < self.vix_recovery_threshold
        spy_rebound = False
        if self.spy_previous_close and self.spy_previous_close > 0:
            spy_change = (current_spy - self.spy_previous_close) / self.spy_previous_close
            if spy_change > self.spy_rebound_threshold:
                spy_rebound = True

        # 条件3: VIX低位 + SPY累计反弹
        spy_cumulative_rebound = False
        if len(self.spy_price_history) >= 4:
            spy_3days_ago = self.spy_price_history[-4]['price']
            spy_cum_change = (current_spy - spy_3days_ago) / spy_3days_ago
            if vix_recovered and spy_cum_change > self.spy_cumulative_rebound:
                spy_cumulative_rebound = True

        if vix_peak_recovery or (vix_recovered and spy_rebound) or spy_cumulative_rebound:
            self.vix_peak_value = current_vix
            self.CheckCooldownReset()
            return True

        return False

    # ========== 冷却期管理 ==========
    def CalculateCooldownPeriod(self):
        """计算新冷却期"""
        self.CleanupStopHistory()
        recent_stops = len(self.stop_history)

        if recent_stops == 0:
            return self.base_cooldown
        elif recent_stops == 1:
            return self.cooldown_level_2
        elif recent_stops == 2:
            return self.cooldown_level_3
        else:
            return self.max_cooldown

    def CleanupStopHistory(self):
        """清理过期止损记录"""
        self.stop_history = [s for s in self.stop_history
                           if (self.Time - s['date']).days <= self.cooldown_tracking_days]

    def CheckCooldownReset(self):
        """检查是否重置冷却期"""
        self.CleanupStopHistory()
        if len(self.stop_history) == 0 and self.cooldown_days != self.base_cooldown:
            self.cooldown_days = self.base_cooldown
            self.Debug(f"[{self.Time}] 冷却期重置为{self.base_cooldown}天")

    def LogStopLossHistory(self):
        """输出止损统计"""
        if len(self.stop_history) == 0:
            return
        stops = len(self.stop_history)
        self.Debug(f"[{self.Time}] 止损统计: 最近10天{stops}次")

    # ========== 期权策略 ==========
    def SellMonthlyPuts(self):
        """每月卖出Put期权"""
        current_month = self.Time.date().replace(day=1)
        if self.last_option_month == current_month:
            return

        nearest_expiry = self.FindNearestExpiry()
        if nearest_expiry is None:
            return

        if self.enable_uvix_trading:
            for symbol in [self.uvix, self.sqqq]:
                name = "UVIX" if symbol == self.uvix else "SQQQ"
                self.SellPutForSymbol(symbol, name, nearest_expiry)
        else:
            self.SellPutForSymbol(self.sqqq, "SQQQ", nearest_expiry)

        self.last_option_month = current_month

    def FindNearestExpiry(self):
        """找到最近到期日"""
        today = self.Time.date()
        all_expiries = set()

        if self.enable_uvix_trading:
            uvix_chain = self.CurrentSlice.OptionChains.get(self.uvix_option)
            if uvix_chain:
                all_expiries.update(x.Expiry.date() for x in uvix_chain)

        sqqq_chain = self.CurrentSlice.OptionChains.get(self.sqqq_option)
        if sqqq_chain:
            all_expiries.update(x.Expiry.date() for x in sqqq_chain)

        if not all_expiries:
            return None

        future_expiries = [d for d in all_expiries if d >= today]
        return min(future_expiries) if future_expiries else None

    def SellPutForSymbol(self, underlying_symbol, name, target_expiry):
        """卖出Put期权"""
        if not self.Portfolio[underlying_symbol].Invested:
            return

        short_quantity = abs(self.Portfolio[underlying_symbol].Quantity)
        current_price = self.Securities[underlying_symbol].Price

        if current_price <= 0:
            return

        contracts = int(short_quantity / 200)
        if contracts < 1:
            return

        target_strike = current_price * 0.85

        option_symbol = self.uvix_option if underlying_symbol == self.uvix else self.sqqq_option
        option_chain = self.CurrentSlice.OptionChains.get(option_symbol)

        if not option_chain:
            return

        puts = [x for x in option_chain if x.Right == OptionRight.Put]
        target_puts = [x for x in puts if x.Expiry.date() == target_expiry]

        if not target_puts:
            return

        selected = min(target_puts, key=lambda x: abs(x.Strike - target_strike))
        option_price = selected.BidPrice if selected.BidPrice > 0 else selected.LastPrice

        if option_price <= 0:
            return

        self.MarketOrder(selected.Symbol, -contracts)
        premium = option_price * 100 * contracts
        self.Debug(f"[{self.Time}] {name}期权: 卖{contracts}张Put @ ${selected.Strike:.2f}, 权利金${premium:.2f}")

    # ========== 日终报告 ==========
    def OnEndOfDay(self, symbol):
        """每日收盘报告（仅周一）"""
        if symbol != self.sqqq or self.Time.weekday() != 0:
            return

        has_position = any(self.Portfolio[s].Invested for s in self.short_symbols.keys())

        total_pnl = 0
        if has_position:
            for sym, name in self.short_symbols.items():
                if self.Portfolio[sym].Invested:
                    total_pnl += self.Portfolio[sym].UnrealizedProfit

        # 统计期权盈亏
        for kvp in self.Portfolio:
            security = kvp.Value
            if security.Invested and security.Type == SecurityType.Option:
                total_pnl += security.UnrealizedProfit

        self.Debug(f"[{self.Time.date()}] 账户: ${self.Portfolio.TotalPortfolioValue:.2f}, 盈亏: ${total_pnl:.2f}")