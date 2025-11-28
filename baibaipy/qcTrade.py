from AlgorithmImports import *

class UVIXShortWithBlackSwanProtection(QCAlgorithm):

    def Initialize(self):
        self.SetStartDate(2015, 1, 1)
        self.SetEndDate(2025, 8, 31)
        self.SetCash(1000000)

        # 添加UVIX和SQQQ
        self.uvix = self.AddEquity("UVIX", Resolution.Minute).Symbol
        self.sqqq = self.AddEquity("SQQQ", Resolution.Minute).Symbol

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
        self.leverage = 1.0  # 杠杆倍数（默认1.0）
        self.rebalance_threshold = 0.05  # 重新平衡阈值（5%），偏离超过此值才调仓
        self.stop_loss_pct = 0.15  # 止损百分比（15%）
        self.vix_threshold = 30  # VIX恐慌阈值
        self.spy_drawdown_threshold = 0.05  # SPY单日跌幅阈值（5%）

        # 资金分配比例（可调整参数）
        self.allocations = {
            self.uvix: 0.3,  # UVIX 50%
            self.sqqq: 0.7   # SQQQ 50%
        }

        # 状态变量
        self.entry_prices = {
            self.uvix: None,
            self.sqqq: None
        }
        self.is_stopped_out = False
        self.spy_previous_close = None
        self.cooldown_days = 5  # 止损后冷却天数
        self.stop_date = None

        # 波动率指标
        self.vix_ema = ExponentialMovingAverage(5)
        self.vix_spike_threshold = 1.5  # VIX快速上涨倍数

        # 每日重新平衡
        self.Schedule.On(
            self.DateRules.EveryDay(self.uvix),
            self.TimeRules.AfterMarketOpen(self.uvix, 30),
            self.Rebalance
        )

        # 盘中监控（每小时检查一次）
        self.Schedule.On(
            self.DateRules.EveryDay(self.uvix),
            self.TimeRules.Every(timedelta(hours=1)),
            self.MonitorIntraday
        )

    def OnData(self, data):
        # 更新VIX EMA
        if data.ContainsKey(self.vix) and data[self.vix] is not None:
            self.vix_ema.Update(self.Time, data[self.vix].Close)

        # 更新SPY前收盘价
        if data.ContainsKey(self.spy) and data[self.spy] is not None:
            if self.spy_previous_close is None:
                self.spy_previous_close = data[self.spy].Close

    def Rebalance(self):
        # 检查是否在冷却期
        if self.is_stopped_out and self.stop_date is not None:
            days_since_stop = (self.Time - self.stop_date).days
            if days_since_stop < self.cooldown_days:
                self.Debug(f"[{self.Time}] 冷却期中，距离恢复还有 {self.cooldown_days - days_since_stop} 天")
                return
            else:
                self.is_stopped_out = False
                self.Debug(f"[{self.Time}] 冷却期结束，恢复做空")

        # 检查黑天鹅信号
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

        # 持续做空所有标的 - 只在偏离超过5%时调仓
        if not self.is_stopped_out:
            for symbol, name in self.short_symbols.items():
                self.RebalanceSymbol(symbol, name)

    def RebalanceSymbol(self, symbol, name):
        """对单个标的进行调仓 - 只在偏离超过5%时才调仓"""
        current_price = self.Securities[symbol].Price

        if current_price <= 0:
            return

        # 计算目标持仓（负数表示做空）
        allocation = self.allocations[symbol]
        target_value = self.Portfolio.TotalPortfolioValue * allocation * self.leverage
        target_shares = -int(target_value / current_price)

        # 获取当前持仓
        current_shares = self.Portfolio[symbol].Quantity

        # 如果没有持仓，直接开仓
        if current_shares == 0:
            if target_shares != 0:
                self.MarketOrder(symbol, target_shares)
                self.entry_prices[symbol] = current_price
                self.Debug(f"[{self.Time}] 开仓做空 {abs(target_shares)} 股 {name} @ ${current_price:.2f}")
            return

        # 计算当前持仓与目标持仓的偏离程度
        if target_shares == 0:
            deviation = 1.0  # 如果目标是0，当前有持仓，则偏离100%
        else:
            deviation = abs(current_shares - target_shares) / abs(target_shares)

        # 只在偏离超过阈值时调仓
        if deviation > self.rebalance_threshold:
            shares_diff = target_shares - current_shares
            self.MarketOrder(symbol, shares_diff)
            self.entry_prices[symbol] = current_price
            self.Debug(f"[{self.Time}] {name} 调仓: 偏离{deviation:.1%}（>{self.rebalance_threshold:.0%}触发调仓）, "
                      f"从 {current_shares} 股调整到 {target_shares} 股 @ ${current_price:.2f}")
        else:
            # 偏离不足5%，不调仓
            if self.Time.hour == 10 and self.Time.minute == 0:  # 每天只在固定时间输出一次
                self.Debug(f"[{self.Time}] {name} 持仓偏离{deviation:.1%}（<{self.rebalance_threshold:.0%}），维持现有仓位")

    def MonitorIntraday(self):
        # 盘中止损检查
        has_position = any(self.Portfolio[symbol].Invested for symbol in self.short_symbols.keys())
        if not has_position:
            return

        # 检查每个标的的止损
        for symbol, name in self.short_symbols.items():
            if self.Portfolio[symbol].Invested:
                self.CheckStopLoss(symbol, name)

    def CheckStopLoss(self, symbol, name):
        """检查单个标的的止损"""
        entry_price = self.entry_prices[symbol]
        if entry_price is None:
            return

        current_price = self.Securities[symbol].Price

        if current_price > 0:
            # 计算未实现损失（做空时价格上涨是亏损）
            unrealized_loss = (current_price - entry_price) / entry_price

            if unrealized_loss > self.stop_loss_pct:
                self.Liquidate(symbol)
                self.is_stopped_out = True
                self.stop_date = self.Time
                self.entry_prices[symbol] = None
                self.Debug(f"[{self.Time}] {name} 触发止损，亏损 {unrealized_loss:.2%}，平仓")

    def DetectBlackSwan(self):
        """检测黑天鹅事件的多重信号"""
        signals = []

        # 信号1: VIX绝对值过高
        if self.Securities[self.vix].Price > self.vix_threshold:
            signals.append("VIX高位")
            self.Debug(f"[{self.Time}] VIX = {self.Securities[self.vix].Price:.2f}")

        # 信号2: VIX急剧上涨
        if self.vix_ema.IsReady:
            current_vix = self.Securities[self.vix].Price
            vix_ema_value = self.vix_ema.Current.Value

            if current_vix > vix_ema_value * self.vix_spike_threshold:
                signals.append("VIX急涨")
                self.Debug(f"[{self.Time}] VIX急涨: 当前={current_vix:.2f}, EMA={vix_ema_value:.2f}")

        # 信号3: SPY单日大跌
        if self.spy_previous_close is not None:
            spy_current = self.Securities[self.spy].Price
            spy_return = (spy_current - self.spy_previous_close) / self.spy_previous_close

            if spy_return < -self.spy_drawdown_threshold:
                signals.append(f"SPY暴跌{spy_return:.2%}")
                self.Debug(f"[{self.Time}] SPY单日跌幅: {spy_return:.2%}")

            self.spy_previous_close = spy_current

        # 如果有2个或以上信号，认为是黑天鹅
        if len(signals) >= 2:
            self.Debug(f"[{self.Time}] 黑天鹅信号: {', '.join(signals)}")
            return True

        return False

    def OnEndOfDay(self):
        # 记录每日状态
        has_position = any(self.Portfolio[symbol].Invested for symbol in self.short_symbols.keys())
        if has_position:
            total_pnl = 0
            for symbol, name in self.short_symbols.items():
                if self.Portfolio[symbol].Invested:
                    pnl = self.Portfolio[symbol].UnrealizedProfit
                    total_pnl += pnl
                    self.Debug(f"[{self.Time.date()}] {name}持仓: {self.Portfolio[symbol].Quantity} 股, 盈亏: ${pnl:.2f}")

            self.Debug(f"[{self.Time.date()}] 总未实现盈亏: ${total_pnl:.2f}, 账户价值: ${self.Portfolio.TotalPortfolioValue:.2f}")