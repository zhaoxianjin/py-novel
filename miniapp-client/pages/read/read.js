var api = require('../../utils/api.js')
var { request } = require('../../utils/request.js')
var { detail, list } = require('../../utils/data.js')

wx.cloud.init({ traceUser: true })
var db = wx.cloud.database()

Page({

  /**
   * 页面的初始数据
   */
  data: {
    chapterUrl: '',
    novelUrl: '',
    novelId: '',
    detail: {},
    isShowChapter: false,
    isShowMenus: false,
    isShowSetting: false,
    isDark: false,    // true为夜间，false为白天
    isLoading: false, // 蒙版状态值
    percentage: 0,    // 阅读进度
    bookName: '',
    scrollTop: 0,
    setting: {
      light: 0,
      font: 34,
      bgs: [
        'rgb(244, 243, 249)',
        'rgb(158, 151, 167)',
        'rgb(177, 160, 132)',
        'rgb(165, 168, 185)',
        'rgb(187, 157, 171)',
      ],
      bg: 'rgb(244, 243, 249)',
    },
    chapter: {
      list: [],
      order: 'asc',
      id: '',
    }
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    var novelId = options.novelId
    var bookName = options.bookName || '兵者'
    var chapterUrl = options.chapterUrl || 'https://www.biquge5200.cc/98_98081/155305426.html'
    var novelUrl = chapterUrl.split('/').slice(0, 4).join('/')   // 用于查询目录
    this.setData({ chapterUrl, novelUrl, bookName, novelId })
    
    var that = this
    wx.getScreenBrightness({
      success: function (e) {
        that.setData({ 'setting.light': e.value*100 })  
      }
    })

    this.handleSearchChapter(novelUrl)
  },
  
  /**
   * 跳转书架页面
   */
  handleBack: function () {
    wx.switchTab({
      url: '../index/index'
    })
  },

  /**
   * 查询小说章节
   */
  handleSearchChapter: function (url) {
    var that = this
    request({
      url: api.GET_CHAPTER,
      data: { url },
    }).then(function (res) {
      that.setData({ 'chapter.list': res })
      that.handleSearchDetail(that.data.chapterUrl)
    })
  },

  /**
   * 查询小说章节详细内容
   */
  handleSearchDetail: function (url, update) {
    var that = this
    this.setData({ isLoading: true })
    request({
      url: api.GET_CONTENT,
      data: { url },
    }).then(function (res) {
      res.title = res.title && res.title.trim()
      var id = that.data.chapter.list.find(item => item.name === res.title).id
      that.setData({ detail: res, chapterUrl: url, 'chapter.id': id, 
        scrollTop: 0, isLoading: false })
      
      if (update) {
        // 修改数据库书架中的小说章节数，更新阅读进度
        request({
          url: api.EDIT_SHELF,
          method: 'PUT',
          data: { chapter_url: url, id: that.data.novelId },
        }).then(function (res) {

        })
      }
    })
  },

  /**
   * 翻页处理
   */
  handlePage: function (e) {
    var url = e.currentTarget.dataset.url 
    var info = e.currentTarget.dataset.info
    
    if (url.indexOf('.html') === -1) {
      if (info === 'prev') {
        wx.showToast({
          title: '已经是第一章了',
        })
      } else if (info === 'next') {
        wx.showToast({
          title: '已经是最新章节了',
        })
      }
      return
    }

    this.handleSearchDetail(url, true)
    this.handleHideChapter()
  },

  /**
   * 显示功能菜单
   */
  handleShowMenus: function () {
    this.setData({ isShowMenus: true })
  },

  /**
   * 隐藏功能菜单
   */
  handleHideMenus: function () {
    this.setData({ isShowMenus: false })
  },

  /**
   * 显示目录侧边框
   */
  handleShowChapter: function () {
    this.handleHideMenus()
    this.setData({ isShowChapter: true })
  },

  /**
   * 隐藏目录侧边框
   */
  handleHideChapter: function () {
    this.setData({ isShowChapter: false, isShowMenus: false })
  },

  /**
   * 修改小说章节排序
   */
  handleChangeOrder: function () {
    var { order, list } = this.data.chapter
    if (order === 'asc') {
      order = 'desc'
    } else {
      order = 'asc'
    }
    list = list.reverse();
    this.setData({ 'chapter.list': list, 'chapter.order': order })
  },

  /**
   * 显示设置面板
   */
  handleShowSetting: function () {
    this.handleHideMenus()
    this.setData({ isShowSetting: true })
  },

  /**
   * 隐藏设置面板
   */
  handleHideSetting: function () {
    this.setData({ isShowSetting: false })
  },

  /**
   * 修改设置面板中的亮度：白天/黑夜
   */
  handleSwitchTheme: function (e) {
    this.handleHideMenus()
    var isDark = e.currentTarget.dataset.theme
    if (isDark) {  // true 表示切换为黑夜
      this.setData({ 'setting.bg': 'rgb(244, 243, 249)', isDark: !isDark })
    } else {
      this.setData({ 'setting.bg': 'rgb(0, 0, 0)', isDark: !isDark })
    }
  },

  /**
   * 修改设置面板中的亮度
   */
  handleChangeLight: function (e) {
    var that = this
    wx.setScreenBrightness({
      value: (e.detail.value / 100).toFixed(1),
      success: function () {
        that.setData({ 'setting.light': e.detail.value })
      }
    })
  },

  /**
   * 修改设置面板中的字体
   */
  handleChangeFont: function (e) {
    var target = e.currentTarget.dataset.target
    var font = this.data.setting.font
    if (target === 'sub') {
      this.setData({ 'setting.font': font - 4 })      
    } else if (target === 'add') {
      this.setData({ 'setting.font': font + 4 })
    } else {
      this.setData({ 'setting.font': 34 })
    }
    this.handleHideSetting()
  },

  /**
   * 修改设置面板中的背景颜色
   */
  handleChangeBg: function (e) {
    var bg = e.currentTarget.dataset.bg
    this.setData({ 'setting.bg': bg })
    this.handleHideSetting()
  },
})