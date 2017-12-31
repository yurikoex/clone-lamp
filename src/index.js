import React from 'react'
import { render } from 'react-dom'
import './index.css'
import { createStore, combineReducers, applyMiddleware } from 'redux'
import { createLogger } from 'redux-logger'
import createHistory from 'history/createBrowserHistory'
import thunk from 'redux-thunk'
import {
  routerReducer,
  routerMiddleware,
  ConnectedRouter
} from 'react-router-redux'
import registerServiceWorker from './registerServiceWorker'
import { Provider, connect } from 'react-redux'
import { Route, Redirect } from 'react-router'
import { Link } from 'react-router-dom'

const history = createHistory()
const router = routerMiddleware(history)
const logger = createLogger()

const store = createStore(
  combineReducers({
    app: (
      state = {
        started: new Date()
      },
      action
    ) => state,
    auth: (
      state = {
        isLoggedIn: false,
        ui: null,
        googleOAuth: null,
        access_token: null,
        clientId: null
      },
      action
    ) => {
      console.log(action)
      if (action.type === 'ACCESS_TOKEN_LOADED')
        return { ...state, access_token: action.access_token }
      else return state
    },
    devices: (state = [], action) => {
      console.log(action)
      if (action.type === 'SAVED_NAME')
        return state.map(d => ({
          ...d,
          name: action.id === d.id ? action.name : d.name,
          edit: false
        }))

      if (action.type === 'EDIT_NAME')
        return state.map(d => ({
          ...d,
          edit: d.id === action.id ? true : false
        }))
      if (action.type === 'DEVICES_LOADED') return [...state, ...action.devices]
      else return state
    },
    router: routerReducer
  }),
  applyMiddleware(thunk, router, logger)
)

const saveName = ({ name, id }) => dispatch =>
  dispatch({
    type: 'SAVED_NAME',
    id,
    name
  })

const editName = id => dispatch =>
  dispatch({
    type: 'EDIT_NAME',
    id
  })

const loadAccessToken = () => dispatch =>
  setTimeout(() => {
    dispatch({
      type: 'ACCESS_TOKEN_LOADED',
      access_token: 'BOB'
    })
  }, 1000)

const loadDevices = () => dispatch =>
  setTimeout(() => {
    dispatch({
      type: 'DEVICES_LOADED',
      devices: [
        { id: 'esp_josh', lastSeen: new Date().getTime(), edit: true },
        {
          id: 'esp_tyson',
          name: 'Basement Lamp',
          edit: false,
          lastSeen: new Date().getTime()
        }
      ]
    })
  }, 1000)

const CheckAuth = WrappedComponent =>
  connect(
    state => state,
    dispatch => ({
      loadAccessToken: () => dispatch(loadAccessToken())
    })
  )(props => {
    if (props.auth.access_token !== null) {
      return <WrappedComponent {...props} />
    } else {
      props.loadAccessToken()
      return <div>Loading Auth...</div>
    }
  })

const Home = CheckAuth(props => {
  console.log('home ---->', props)
  if (props.location.pathname === '/') return <Redirect to={'/devices'} />
  else return <Redirect to={props.location.pathname} />
})
const style = {
  ul: {
    listStyleType: 'none',
    padding: 0,
    margin: 0
  },
  listItemContainer: {
    width: '100%',
    height: '40px',
    background: '#efefef',
    margin: '1px'
  },
  deviceListName: {
    label: { width: '100%', height: '40px' },
    edit: {}
  }
}

const DeviceListName = ({ device, actions: { saveName, editName } }) => {
  const changeName = e => {
    e.preventDefault()
    editName(device.id)
  }
  let name = ''
  const setName = data => (name = data)
  const sendChange = () => saveName({ name, id: device.id })
  if (device.edit !== true) {
    return (
      <Link to={`/device/${device.id}`}>
        <div style={style.deviceListName.label}>
          <span onClick={e => changeName(e)}>{device.name}</span>
        </div>
      </Link>
    )
  } else
    return (
      <div style={style.deviceListName.edit}>
        <input
          type="text"
          defaultValue={device.name}
          onChange={e => setName(e.target.value)}
          onBlur={e => sendChange()}
        />
      </div>
    )
}

const DeviceListItem = ({ device, actions }) => (
  <div style={style.listItemContainer}>
    <DeviceListName actions={actions} device={device} />
  </div>
)

const DeviceList = CheckAuth(props => {
  const { saveName, editName } = props
  console.log('DeviceList ---->', props)
  return (
    <ul style={style.ul}>
      {props.devices.map((device, key) => (
        <li key={key}>
          <DeviceListItem device={device} actions={{ saveName, editName }} />
        </li>
      ))}
    </ul>
  )
})

const Devices = CheckAuth(
  connect(
    state => state,
    dispatch => ({
      loadDevices: () => dispatch(loadDevices()),
      saveName: data => dispatch(saveName(data)),
      editName: id => dispatch(editName(id))
    })
  )(props => {
    if (props.devices.length > 0) {
      return <DeviceList {...props} />
    } else {
      props.loadDevices()
      return <div>Loading devices...</div>
    }
  })
)

const Details = props => {
  console.log('Details ---->', props)
  const device = props.devices.find(d => d.id === props.match.params.id)
  return (
    <div>
      <h2>Details for Device: {device.name || device.id}</h2>
      <h5>Last Seen: {device.lastSeen}</h5>
      <Link to={`/devices`}>Back To Devices</Link>
    </div>
  )
}

const Device = CheckAuth(
  connect(
    state => state,
    dispatch => ({
      loadDevices: () => dispatch(loadDevices())
    })
  )(props => {
    if (props.devices.length > 0) {
      return <Details {...props} />
    } else {
      props.loadDevices()
      return <div>Loading device...</div>
    }
  })
)

const App = ({ store, history }) => (
  <Provider store={store}>
    <ConnectedRouter history={history}>
      <div>
        <Route exact={true} path="/" component={Home} />
        <Route exact={true} path="/devices" component={Devices} />
        <Route exact={true} path="/device/:id" component={Device} />
      </div>
    </ConnectedRouter>
  </Provider>
)

render(<App store={store} history={history} />, document.getElementById('root'))
registerServiceWorker()
