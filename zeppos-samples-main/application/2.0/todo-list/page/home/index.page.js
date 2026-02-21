import { createWidget, widget, prop } from '@zos/ui'
import { getDeviceInfo, SCREEN_SHAPE_SQUARE } from '@zos/device'
import { log as Logger } from '@zos/utils'
import { localStorage } from '@zos/storage'

import { TITLE_TEXT_STYLE, TIPS_TEXT_STYLE, SCROLL_LIST, ADD_BUTTON } from './index.style'
import { getScrollListDataConfig } from './../../utils/index'

const logger = Logger.getLogger('stock-page')
const { messageBuilder } = getApp()._options.globalData

Page({
  state: {
    scrollList: null,
    tipText: null,
    refreshText: null,
    addButton: null,
    dataList: []
  },

  onInit() {
    logger.debug('page onInit invoked')
    this.onMessage()
  },

  build() {
    if (getDeviceInfo().screenShape !== SCREEN_SHAPE_SQUARE) {
      this.state.title = createWidget(widget.TEXT, {
        ...TITLE_TEXT_STYLE
      })
    }

    this.createAndUpdateList()

    this.state.refreshButton = createWidget(widget.BUTTON, {
    ...ADD_BUTTON,
    text: 'Refresh',
    click_func: () => {
      this.refreshStocks()
    }
  })

  },

  onDestroy() {
    localStorage.setItem('dataList', this.state.dataList)
  },

  onMessage() {
    messageBuilder.on('call', ({ payload: buf }) => {
      const data = messageBuilder.buf2Json(buf)

      const dataList = data.map((i) => ({ name: i }))

      this.refreshAndUpdate(dataList)
    })
  },

  changeUI(showEmpty) {
    const { dataList } = this.state

    if (showEmpty) {
      if (dataList.length === 0) {
        !this.state.tipText &&
          (this.state.tipText = createWidget(widget.TEXT, {
            ...TIPS_TEXT_STYLE
          }))
      }

      const isTip = dataList.length === 0

      this.state.tipText &&
        this.state.tipText.setProperty(prop.VISIBLE, isTip)

      this.state.scrollList &&
        this.state.scrollList.setProperty(prop.VISIBLE, !isTip)
    }
  },

  createAndUpdateList(showEmpty = true) {
    const { scrollList, dataList } = this.state
    this.changeUI(showEmpty)

    const dataTypeConfig = getScrollListDataConfig(
      dataList.length === 0 ? -1 : 0,
      dataList.length
    )

    if (scrollList) {
      scrollList.setProperty(prop.UPDATE_DATA, {
        data_array: dataList,
        data_count: dataList.length,
        data_type_config: [
          { start: 0, end: dataList.length, type_id: 2 }
        ],
        data_type_config_count: dataTypeConfig.length,
        on_page: 1
      })
    } else {
      this.state.scrollList = createWidget(widget.SCROLL_LIST, {
        ...(SCROLL_LIST || {}),
        data_array: dataList,
        data_count: dataList.length,
        data_type_config: dataTypeConfig,
        data_type_config_count: dataTypeConfig.length,
        on_page: 1
      })
    }
  },

  refreshStocks() {
  messageBuilder
    .request({
      method: 'REFRESH_STOCKS'
    })
    .catch(() => {})
},

  refreshAndUpdate(dataList = []) {
    this.state.dataList = []
    this.createAndUpdateList(false)

    setTimeout(() => {
      this.state.dataList = dataList
      this.createAndUpdateList()
    }, 20)
  }
})