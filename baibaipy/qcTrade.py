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

        # 期权策略
        self.options_sold_this_month = False
        self.last_option_month = None

        # 波动率指标
        self.vix_ema = ExponentialMovingAverage(5)
        self.vix_spike_threshold = 1.5

        # ========== 新增:限价单优化参数 ==========
        self.limit_order_tickets = {}  # 记录限价单ticket
        self.limit_order_premium = 0.002  # 限价单溢价:比市价高0.2%(做空所以要更高价格卖出)
        self.limit_order_duration_minutes = 27  # 有效期27分钟(从开盘3分钟到30分钟)

        # ========== 修改后的定时任务 ==========
        # 开盘后3分钟:检查偏差并挂限价单
        self.Schedule.On(
            self.DateRules.EveryDay(self.uvix),
            self.TimeRules.AfterMarketOpen(self.uvix, 3),
            self.CheckDeviationAndPlaceLimitOrders
        )

        # 开盘后30分钟:检查限价单,未成交则用市价单
        self.Schedule.On(
            self.DateRules.EveryDay(self.uvix),
            self.TimeRules.AfterMarketOpen(self.uvix, 30),
            self.ExecuteFallbackMarketOrders
        )

        # 每月第一个交易日10:00:卖出当月到期的Put期权
        self.Schedule.On(
            self.DateRules.MonthStart(self.uvix),
            self.TimeRules.AfterMarketOpen(self.uvix, 30),
            self.SellMonthlyPuts
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

            self.vix_history.append({'date': self.Time.date(), 'value': current_vix})
            if len(self.vix_history) > 10:
                self.vix_history.pop(0)

            if self.vix_peak_value is None or current_vix > self.vix_peak_value:
                self.vix_peak_value = current_vix

            if self.vix_previous_close is not None and self.vix_previous_close > 0:
                vix_daily_change = (current_vix - self.vix_previous_close) / self.vix_previous_close

                if vix_daily_change > self.vix_spike_threshold_pct:
                    self.in_vix_spike_observation = True
                    self.vix_spike_date = self.Time
                    self.Debug(f"[{self.Time}] *** VIX闪崩事件 *** VIX单日暴涨 {vix_daily_change:.1%} ({self.vix_previous_close:.2f} -> {current_vix:.2f})，进入{self.observation_days}天观望期")

            self.vix_previous_close = current_vix

        if data.ContainsKey(self.spy) and data[self.spy] is not None:
            current_spy = data[self.spy].Close
            if self.spy_previous_close is None:
                self.spy_previous_close = current_spy

            self.spy_price_history.append({'date': self.Time.date(), 'price': current_spy})
            if len(self.spy_price_history) > 5:
                self.spy_price_history.pop(0)

    # ========== 新增:限价单逻辑 ==========

    def CheckDeviationAndPlaceLimitOrders(self):
        """开盘后3分钟:检查仓位偏差并挂限价单"""

        # 先执行风控检查和仓位调整逻辑
        self.CheckPersistentVolatility()
        self.AdjustAllocations()

        # 检查是否在观望期
        if self.in_vix_spike_observation:
            days_remaining = self.observation_days - (self.Time - self.vix_spike_date).days if self.vix_spike_date else 0
            self.Debug(f"[{self.Time}] VIX闪崩观望期中,还剩 {days_remaining} 天,跳过交易")
            return

        # 检查观望期是否结束
        if self.in_vix_spike_observation and self.vix_spike_date is not None:
            days_since_spike = (self.Time - self.vix_spike_date).days
            if days_since_spike >= self.observation_days:
                self.in_vix_spike_observation = False
                self.Debug(f"[{self.Time}] VIX闪崩观望期结束，恢复正常交易")

        # 检查快速恢复
        if self.is_stopped_out and self.CheckFastRecovery():
            self.is_stopped_out = False
            self.stop_date = None
            self.Debug(f"[{self.Time}] *** 检测到快速恢复 *** 跳过冷却期，立即重新建仓")

        # 检查冷却期
        if self.is_stopped_out and self.stop_date is not None:
            days_since_stop = (self.Time - self.stop_date).days
            if days_since_stop < self.cooldown_days:
                self.Debug(f"[{self.Time}] 冷却期中,距离恢复还有 {self.cooldown_days - days_since_stop} 天")
                return
            else:
                self.is_stopped_out = False
                self.Debug(f"[{self.Time}] 冷却期结束，恢复做空")

        # 检查黑天鹅
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

        # 为每个标的检查偏差并挂限价单
        if not self.is_stopped_out:
            for symbol, name in self.short_symbols.items():
                self.CheckDeviationAndPlaceLimitOrder(symbol, name)

    def CheckDeviationAndPlaceLimitOrder(self, symbol, name):
        """检查单个标的的仓位偏差,如果需要调仓则挂限价单"""

        current_price = self.Securities[symbol].Price

        if current_price <= 0:
            self.Debug(f"[{self.Time}] {name} 价格无效: ${current_price:.2f},跳过")
            return

        # 计算目标仓位
        allocation = self.allocations[symbol]
        target_value = self.Portfolio.TotalPortfolioValue * allocation * self.leverage
        target_shares = -int(target_value / current_price)

        current_shares = self.Portfolio[symbol].Quantity

        # 计算偏离度
        if target_shares == 0:
            if current_shares == 0:
                deviation = 0
            else:
                deviation = 1.0
        else:
            deviation = abs(current_shares - target_shares) / abs(target_shares)

        # 如果偏离小于阈值,不需要调仓
        if deviation <= self.rebalance_threshold:
            if current_shares != 0:
                self.Debug(f"[{self.Time}] {name} 持仓偏离{deviation:.1%},无需调仓(当前:{current_shares},目标:{target_shares})")
            return

        shares_needed = target_shares - current_shares

        if shares_needed == 0:
            return

        # 计算限价:做空需要更高的价格(卖出更贵)
        # 市价$10,我们挂$10.01的限价单卖出(做空)
        limit_price_raw = current_price * (1 + self.limit_order_premium)

        # 修复精度问题:限价单价格四舍五入到2位小数
        limit_price = round(limit_price_raw, 2)

        # 下限价单
        ticket = self.LimitOrder(symbol, shares_needed, limit_price)

        self.limit_order_tickets[symbol] = {
            'ticket': ticket,
            'target_shares': shares_needed,
            'limit_price': limit_price,
            'market_price': current_price,
            'current_shares': current_shares,
            'target_total': target_shares
        }

        self.Debug(f"[{self.Time}] === {name} 挂限价单 ===")
        self.Debug(f"  当前持仓: {current_shares} 股")
        self.Debug(f"  目标持仓: {target_shares} 股")
        self.Debug(f"  偏离度: {deviation:.1%}")
        self.Debug(f"  需要调整: {shares_needed} 股")
        self.Debug(f"  市价: ${current_price:.2f}")
        self.Debug(f"  限价: ${limit_price:.2f} (溢价 {self.limit_order_premium:.2%})")

    def ExecuteFallbackMarketOrders(self):
        """开盘后30分钟:检查限价单,未成交则用市价单"""

        if not self.limit_order_tickets:
            self.Debug(f"[{self.Time}] 无待处理的限价单")
            return

        self.Debug(f"[{self.Time}] ========== 检查限价单执行情况 ==========")

        for symbol, order_info in list(self.limit_order_tickets.items()):
            ticket = order_info['ticket']
            name = self.short_symbols[symbol]

            # 检查订单状态
            if ticket.Status == OrderStatus.Filled:
                fill_price = ticket.AverageFillPrice
                self.entry_prices[symbol] = fill_price
                saved_slippage = (fill_price - order_info['market_price']) * abs(order_info['target_shares'])

                self.Debug(f"[{self.Time}] ✓ {name} 限价单已完全成交!")
                self.Debug(f"  成交股数: {ticket.QuantityFilled} 股")
                self.Debug(f"  成交价格: ${fill_price:.2f}")
                self.Debug(f"  限价价格: ${order_info['limit_price']:.2f}")
                self.Debug(f"  开盘市价: ${order_info['market_price']:.2f}")
                self.Debug(f"  节省滑点: ${saved_slippage:.2f} (${(fill_price - order_info['market_price']):.4f}/股)")

            elif ticket.Status in [OrderStatus.Submitted, OrderStatus.PartiallyFilled]:
                # 取消未成交的限价单
                ticket.Cancel()

                # 计算还需要的股数
                filled_quantity = ticket.QuantityFilled
                remaining_quantity = order_info['target_shares'] - filled_quantity

                if abs(remaining_quantity) > 0:
                    # 用市价单补齐
                    current_price = self.Securities[symbol].Price

                    if current_price > 0:
                        market_ticket = self.MarketOrder(symbol, remaining_quantity)
                        self.entry_prices[symbol] = current_price

                        if filled_quantity != 0:
                            self.Debug(f"[{self.Time}] ⚠ {name} 限价单部分成交,使用市价单补齐")
                            self.Debug(f"  限价单成交: {filled_quantity} 股 @ ${ticket.AverageFillPrice:.2f}")
                            self.Debug(f"  市价单补齐: {remaining_quantity} 股 @ ${current_price:.2f}")
                        else:
                            self.Debug(f"[{self.Time}] ✗ {name} 限价单未成交,改用市价单")
                            self.Debug(f"  限价: ${order_info['limit_price']:.2f} (未成交)")
                            self.Debug(f"  市价: ${current_price:.2f}")
                            self.Debug(f"  市价单: {remaining_quantity} 股")
                    else:
                        self.Debug(f"[{self.Time}] ✗ {name} 当前价格无效,跳过")
                else:
                    self.Debug(f"[{self.Time}] ✓ {name} 限价单已完全成交")

            elif ticket.Status == OrderStatus.Canceled:
                # 订单已取消,用市价单
                current_price = self.Securities[symbol].Price

                if current_price > 0:
                    market_ticket = self.MarketOrder(symbol, order_info['target_shares'])
                    self.entry_prices[symbol] = current_price

                    self.Debug(f"[{self.Time}] ⚠ {name} 限价单已被取消,使用市价单")
                    self.Debug(f"  市价单: {order_info['target_shares']} 股 @ ${current_price:.2f}")

            elif ticket.Status == OrderStatus.Invalid:
                self.Debug(f"[{self.Time}] ✗ {name} 限价单无效,状态: {ticket.Status}")

        # 清空限价单记录
        self.limit_order_tickets.clear()
        self.Debug(f"[{self.Time}] ========== 开仓流程完成 ==========")

        # 输出最终持仓
        for symbol, name in self.short_symbols.items():
            if self.Portfolio[symbol].Invested:
                position = self.Portfolio[symbol]
                self.Debug(f"[{self.Time}] {name} 最终持仓: {position.Quantity} 股 @ ${position.AveragePrice:.2f}")

    def Rebalance(self):
        """已移除独立的Rebalance函数,所有再平衡逻辑已整合到CheckDeviationAndPlaceLimitOrders中"""
        pass

    def RebalanceSymbolFinal(self, symbol, name):
        """已移除,功能已整合到CheckDeviationAndPlaceLimitOrder中"""
        pass

    # ========== 以下保持原有逻辑不变 ==========

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

        vix_recovered = current_vix < self.vix_recovery_threshold
        spy_single_day_rebound = False
        if self.spy_previous_close is not None and self.spy_previous_close > 0:
            spy_change = (current_spy - self.spy_previous_close) / self.spy_previous_close
            if spy_change > self.spy_rebound_threshold:
                spy_single_day_rebound = True

        condition2 = vix_recovered and spy_single_day_rebound

        spy_cumulative_rebound = False
        if len(self.spy_price_history) >= 4:
            spy_3days_ago = self.spy_price_history[-4]['price']
            spy_cumulative_change = (current_spy - spy_3days_ago) / spy_3days_ago
            if vix_recovered and spy_cumulative_change > self.spy_cumulative_rebound:
                spy_cumulative_rebound = True

        if vix_peak_recovery or condition2 or spy_cumulative_rebound:
            self.vix_peak_value = current_vix
            return True

        return False

    def SellMonthlyPuts(self):
        """每月初卖出当月到期的Put期权"""
        current_month = self.Time.date().replace(day=1)

        if self.last_option_month == current_month:
            return

        self.Debug(f"[{self.Time}] ========== 每月期权策略 ==========")

        nearest_expiry = self.FindNearestExpiry()

        if nearest_expiry is None:
            return

        for symbol in [self.uvix, self.sqqq]:
            name = "UVIX" if symbol == self.uvix else "SQQQ"
            self.SellPutForSymbol(symbol, name, nearest_expiry)

        self.last_option_month = current_month

    def FindNearestExpiry(self):
        today = self.Time.date()
        all_expiries = set()

        uvix_chain = self.CurrentSlice.OptionChains.get(self.uvix_option)
        if uvix_chain:
            all_expiries.update(x.Expiry.date() for x in uvix_chain)

        sqqq_chain = self.CurrentSlice.OptionChains.get(self.sqqq_option)
        if sqqq_chain:
            all_expiries.update(x.Expiry.date() for x in sqqq_chain)

        if not all_expiries:
            return None

        future_expiries = [d for d in all_expiries if d >= today]

        if not future_expiries:
            return None

        return min(future_expiries)

    def SellPutForSymbol(self, underlying_symbol, name, target_expiry):
        """为指定标的卖出Put期权"""
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

        if option_chain is None or len(option_chain) == 0:
            return

        puts = [x for x in option_chain if x.Right == OptionRight.Put]

        if len(puts) == 0:
            return

        target_puts = [x for x in puts if x.Expiry.date() == target_expiry]

        if len(target_puts) == 0:
            return

        selected_option = min(target_puts, key=lambda x: abs(x.Strike - target_strike))

        option_price = selected_option.BidPrice if selected_option.BidPrice > 0 else selected_option.LastPrice

        if option_price <= 0:
            return

        self.MarketOrder(selected_option.Symbol, -contracts)

        premium = option_price * 100 * contracts

        self.Debug(f"[{self.Time}] *** [{name} 期权成交] ***")
        self.Debug(f"[{self.Time}] 卖出 {contracts} 张 Put, 行权价: ${selected_option.Strike:.2f}, 收取权利金: ${premium:.2f}")

    def OnEndOfDay(self, symbol):
        """每日结束时输出持仓信息"""
        if symbol != self.uvix:
            return

        has_position = any(self.Portfolio[s].Invested for s in self.short_symbols.keys())

        option_positions = []
        option_pnl = 0
        for kvp in self.Portfolio:
            security = kvp.Value
            if security.Invested and security.Type == SecurityType.Option:
                option_pnl += security.UnrealizedProfit
                option_positions.append({
                    'symbol': security.Symbol,
                    'quantity': security.Quantity,
                    'pnl': security.UnrealizedProfit,
                    'avg_price': security.AveragePrice,
                    'current_price': security.Price
                })

        if has_position or len(option_positions) > 0:
            total_pnl = 0

            if has_position:
                for sym, name in self.short_symbols.items():
                    if self.Portfolio[sym].Invested:
                        pnl = self.Portfolio[sym].UnrealizedProfit
                        total_pnl += pnl
                        # 只在仓位有变化或每周一输出
                        if self.Time.weekday() == 0:  # 周一
                            self.Debug(f"[{self.Time.date()}] {name}持仓: {self.Portfolio[sym].Quantity} 股, 盈亏: ${pnl:.2f}")

            if len(option_positions) > 0:
                total_pnl += option_pnl
                # 只在每周一输出期权详情
                if self.Time.weekday() == 0:
                    self.Debug(f"[{self.Time.date()}] 期权总盈亏: ${option_pnl:.2f}")

            # 每天输出总账户情况
            self.Debug(f"[{self.Time.date()}] 账户总值: ${self.Portfolio.TotalPortfolioValue:.2f}, 总盈亏: ${total_pnl:.2f}")