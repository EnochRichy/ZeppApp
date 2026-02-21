import { gettext } from 'i18n'
import { DEFAULT_TODO_LIST } from './../utils/constants'

AppSettingsPage({
  state: {
    todoList: [],
    stockSymbol: '',
    props: {}
  },

  /* -------------------- TODO METHODS -------------------- */

  addTodoList(val) {
    this.state.todoList = [...this.state.todoList, val]
    this.setTodoItem()
  },

  editTodoList(val, index) {
    this.state.todoList[index] = val
    this.setTodoItem()
  },

  deleteTodoList(index) {
    this.state.todoList = this.state.todoList.filter((_, ind) => ind !== index)
    this.setTodoItem()
  },

  setTodoItem() {
    const newString = JSON.stringify(this.state.todoList)
    this.state.props.settingsStorage.setItem('todoList', newString)
  },

  /* -------------------- STOCK METHODS -------------------- */

  setStockSymbol(val) {
    if (!val || val.trim().length === 0) return

    const formatted = val.trim().toUpperCase()

    this.state.stockSymbol = formatted
    this.state.props.settingsStorage.setItem('stockSymbol', formatted)
  },

  /* -------------------- INITIAL STATE LOAD -------------------- */

  setState(props) {
    this.state.props = props

    // Load todo list
    if (props.settingsStorage.getItem('todoList')) {
      this.state.todoList = JSON.parse(
        props.settingsStorage.getItem('todoList')
      )
    } else {
      this.state.todoList = [...DEFAULT_TODO_LIST]
    }

    // Load stock symbol
    if (props.settingsStorage.getItem('stockSymbol')) {
      this.state.stockSymbol =
        props.settingsStorage.getItem('stockSymbol')
    } else {
      this.state.stockSymbol = 'RELIANCE'
    }

    console.log('Loaded todoList:', this.state.todoList)
    console.log('Loaded stockSymbol:', this.state.stockSymbol)
  },

  /* -------------------- UI BUILD -------------------- */

  build(props) {
    this.setState(props)

    const contentItems = []

    /* -------- STOCK SECTION -------- */

    const stockSection = View(
      {
        style: {
          marginBottom: '20px',
          padding: '12px',
          border: '1px solid #eaeaea',
          borderRadius: '8px',
          backgroundColor: 'white'
        }
      },
      [
        TextInput({
          label: 'NSE Stock Symbol',
          value: this.state.stockSymbol,
          subStyle: {
            color: '#333',
            fontSize: '14px'
          },
          maxLength: 20,
          onChange: (val) => {
            this.setStockSymbol(val)
          }
        })
      ]
    )

    /* -------- ADD TODO BUTTON -------- */

    const addBTN = View(
      {
        style: {
          fontSize: '12px',
          lineHeight: '30px',
          borderRadius: '30px',
          background: '#409EFF',
          color: 'white',
          textAlign: 'center',
          padding: '0 15px',
          width: '30%'
        }
      },
      [
        TextInput({
          label: gettext('addTodo'),
          onChange: (val) => {
            this.addTodoList(val)
          }
        })
      ]
    )

    /* -------- EXISTING TODO LIST -------- */

    this.state.todoList.forEach((item, index) => {
      contentItems.push(
        View(
          {
            style: {
              borderBottom: '1px solid #eaeaea',
              padding: '6px 0',
              marginBottom: '6px',
              display: 'flex',
              flexDirection: 'row'
            }
          },
          [
            View(
              {
                style: {
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center'
                }
              },
              [
                TextInput({
                  label: '',
                  bold: true,
                  value: item,
                  subStyle: {
                    color: '#333',
                    fontSize: '14px'
                  },
                  maxLength: 200,
                  onChange: (val) => {
                    if (val.length > 0 && val.length <= 200) {
                      this.editTodoList(val, index)
                    } else {
                      console.log(
                        "todoList can't be empty or too long!"
                      )
                    }
                  }
                })
              ]
            ),
            Button({
              label: gettext('delete'),
              style: {
                fontSize: '12px',
                borderRadius: '30px',
                background: '#D85E33',
                color: 'white'
              },
              onClick: () => {
                this.deleteTodoList(index)
              }
            })
          ]
        )
      )
    })

    /* -------- FINAL RETURN -------- */

    return View(
      {
        style: {
          padding: '12px 20px'
        }
      },
      [
        stockSection,
        addBTN,
        contentItems.length > 0 &&
          View(
            {
              style: {
                marginTop: '12px',
                padding: '10px',
                border: '1px solid #eaeaea',
                borderRadius: '6px',
                backgroundColor: 'white'
              }
            },
            [...contentItems]
          )
      ]
    )
  }
})