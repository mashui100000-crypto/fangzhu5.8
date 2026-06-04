const { createId, normalizeRoom } = require('../../utils/room');

const app = getApp();

Page({
  data: {
    id: '',
    isAdd: true,
    room: {}
  },

  onLoad(options) {
    const rooms = wx.getStorageSync(app.globalData.storageKey) || [];
    const current = rooms.find((room) => room.id === options.id);
    const isAdd = !current;
    const room = normalizeRoom(current || Object.assign({}, app.globalData.defaultRoom, { id: createId() }));

    this.setData({
      id: room.id,
      isAdd,
      room
    });
  },

  updateField(event) {
    const field = event.currentTarget.dataset.field;
    const value = event.detail.value;
    this.setData({
      [`room.${field}`]: value
    });
  },

  onMoveInDateChange(event) {
    const date = event.detail.value;
    const day = Number(date.split('-')[2]) || 1;
    this.setData({
      'room.moveInDate': date,
      'room.payDay': day
    });
  },

  onPayDayChange(event) {
    let day = Number(event.detail.value) || 1;
    day = Math.max(1, Math.min(31, day));
    this.setData({ 'room.payDay': day });
  },

  saveRoom() {
    const room = normalizeRoom(this.data.room);
    if (!room.roomNo) {
      wx.showToast({ title: '请填写房号', icon: 'none' });
      return;
    }

    const rooms = wx.getStorageSync(app.globalData.storageKey) || [];
    const index = rooms.findIndex((item) => item.id === room.id);
    if (index >= 0) {
      rooms[index] = room;
    } else {
      rooms.push(room);
    }

    wx.setStorageSync(app.globalData.storageKey, rooms);
    wx.showToast({ title: '已保存', icon: 'success' });
    setTimeout(() => wx.navigateBack(), 350);
  }
});
