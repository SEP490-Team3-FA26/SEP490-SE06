// Bộ lập lịch điều tiết 4 luồng mô phỏng song song theo hệ số tốc độ và kịch bản
class Scheduler {
  constructor(engine, config) {
    this.engine = engine;
    this.config = config;

    this.browseTimer = null;
    this.orderTimer = null;
    this.posTimer = null;
    this.warehouseTimer = null;
  }

  start() {
    this.stop();
    const speed = Math.max(1, Math.min(60, this.engine.state.speedMultiplier || 1));
    const scenario = this.engine.state.currentScenario || 'NORMAL';

    // Hệ số điều chỉnh theo kịch bản
    let browseFactor = 1;
    let orderFactor = 1;
    let whFactor = 1;

    if (scenario === 'RUSH_HOUR') {
      browseFactor = 0.4; // Nhanh gấp 2.5 lần
      orderFactor = 0.4;
    } else if (scenario === 'SUPPLY_CHAIN') {
      whFactor = 0.35; // Nhập kho liên tục
    } else if (scenario === 'NIGHT_SHIFT') {
      browseFactor = 2.0;
      orderFactor = 2.0;
    }

    // Luồng 1: Khách tìm kiếm & xem sản phẩm (tối thiểu 1000ms)
    const browseInterval = Math.max(1000, Math.round((this.config.intervals.browsingBaseMs * browseFactor) / speed));
    this.browseTimer = setInterval(() => {
      if (!this.engine.state.isGatewayOnline) return;
      this.engine.simulateCustomerBrowsing().catch(() => {});
    }, browseInterval);

    // Luồng 2: Khách đặt mua Online COD & đánh giá sao (tối thiểu 2000ms)
    const orderInterval = Math.max(2000, Math.round((this.config.intervals.orderBaseMs * orderFactor) / speed));
    this.orderTimer = setInterval(() => {
      if (!this.engine.state.isGatewayOnline) return;
      this.engine.simulateCustomerOrderAndReview().catch(() => {});
    }, orderInterval);

    // Luồng 3: Dược sĩ check-in GPS theo ca & bán lẻ POS (tối thiểu 1500ms)
    const posInterval = Math.max(1500, Math.round(this.config.intervals.posBaseMs / speed));
    this.posTimer = setInterval(() => {
      if (!this.engine.state.isGatewayOnline) return;
      this.engine.simulatePharmacistPOSAndAttendance().catch(() => {});
    }, posInterval);

    // Luồng 4: Thủ kho tổng PR -> PO -> GRN -> Chuyển kho (tối thiểu 3000ms)
    const whInterval = Math.max(3000, Math.round((this.config.intervals.warehouseBaseMs * whFactor) / speed));
    this.warehouseTimer = setInterval(() => {
      if (!this.engine.state.isGatewayOnline) return;
      this.engine.simulateWarehouseOperations().catch(() => {});
    }, whInterval);
  }

  stop() {
    if (this.browseTimer) {
      clearInterval(this.browseTimer);
      this.browseTimer = null;
    }
    if (this.orderTimer) {
      clearInterval(this.orderTimer);
      this.orderTimer = null;
    }
    if (this.posTimer) {
      clearInterval(this.posTimer);
      this.posTimer = null;
    }
    if (this.warehouseTimer) {
      clearInterval(this.warehouseTimer);
      this.warehouseTimer = null;
    }
  }

  updateSpeed(speed) {
    this.engine.state.speedMultiplier = Math.max(1, Math.min(60, Number(speed) || 1));
    if (this.engine.state.isRunning) {
      this.start();
    }
  }
}

module.exports = Scheduler;
