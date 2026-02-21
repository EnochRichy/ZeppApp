import { gettext } from 'i18n'
import { DEFAULT_TODO_LIST } from './../utils/constants'

AppSettingsPage({
  state: {
    todoList: [],
    props: {}
  },

  addTodoList(val) {
    if (!val || val.trim().length === 0) return
    const formatted = val.trim().toUpperCase()
    this.state.todoList = [...this.state.todoList, formatted]
    this.save()
  },

  editTodoList(val, index) {
    const formatted = val.trim().toUpperCase()
    this.state.todoList[index] = formatted
    this.save()
  },

  deleteTodoList(index) {
    this.state.todoList = this.state.todoList.filter((_, i) => i !== index)
    this.save()
  },

  save() {
    this.state.props.settingsStorage.setItem(
      'todoList',
      JSON.stringify(this.state.todoList)
    )
  },

  setState(props) {
    this.state.props = props

    if (props.settingsStorage.getItem('todoList')) {
      this.state.todoList = JSON.parse(
        props.settingsStorage.getItem('todoList')
      )
    } else {
      this.state.todoList = [...DEFAULT_TODO_LIST]
    }
  },

  build(props) {
    this.setState(props)

    const contentItems = []

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
            View({ style: { flex: 1 } }, [
              TextInput({
                value: item,
                onChange: (val) => {
                  this.editTodoList(val, index)
                }
              })
            ]),
            Button({
              label: gettext('delete'),
              style: {
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

    return View(
      { style: { padding: '12px 20px' } },
      [
        TextInput({
          label: 'Add NSE Stock Symbol',
          onChange: (val) => {
            this.addTodoList(val)
          }
        }),
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