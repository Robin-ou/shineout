import React, { Component } from 'react'
import PropTypes from 'prop-types'
import createReactContext from 'create-react-context'
import validate from '../utils/validate'
import { FormError, isSameError } from '../utils/errors'
import { ERROR_TYPE, FORCE_PASS, IGNORE_VALIDATE } from '../Datum/types'
import FieldError from './FieldError'

const { Provider, Consumer } = createReactContext()

const extendName = (path = '', name) => {
  if (name === undefined) return undefined
  if (name === '') return path
  if (Array.isArray(name)) return name.map(n => extendName(path, n))
  return `${path}${path.length > 0 ? '.' : ''}${name}`
}

class FieldSet extends Component {
  constructor(props) {
    super(props)

    this.validate = this.validate.bind(this)
    this.handleUpdate = this.handleUpdate.bind(this)
  }

  componentDidMount() {
    const { formDatum, name, defaultValue } = this.props
    formDatum.bind(
      name,
      this.handleUpdate,
      defaultValue,
      this.validate,
    )
  }

  componentWillUnmount() {
    this.$willUnmount = true
    const { formDatum, name } = this.props
    formDatum.unbind(name, this.handleUpdate)
  }

  validate() {
    const { formDatum, name } = this.props
    const value = formDatum.get(name)
    const data = formDatum.getValue()
    let rules = [...this.props.rules]
    rules = rules.concat(formDatum.getRule(name))

    if (rules.length === 0) return Promise.resolve(true)

    return validate(value, data, rules).then(() => {
      this.handleError()
      return true
    }, (e) => {
      this.handleError(e)
      return new FormError(e)
    })
  }

  handleError(error) {
    const { formDatum, name } = this.props
    if (isSameError(error, formDatum.getError(name, true))) return
    formDatum.setError(name, error, true)
  }

  handleUpdate(v, n, type) {
    if (this.updateTimer) clearTimeout(this.updateTimer)
    this.updateTimer = setTimeout(() => {
      if (type === ERROR_TYPE || type === FORCE_PASS || type === IGNORE_VALIDATE) {
        if (this.$willUnmount) return
        this.forceUpdate()
      } else {
        this.validate().then(() => {
          if (this.$willUnmount) return
          this.forceUpdate()
        })
      }
    })
  }

  handleInsert(index, value) {
    const { formDatum, name } = this.props
    formDatum.insert(name, index, value)
    this.validate().then(() => {
      if (this.$willUnmount) return
      this.forceUpdate()
    })
  }

  handleRemove(index) {
    const { formDatum, name } = this.props
    formDatum.splice(name, index)
    this.validate().then(() => {
      if (this.$willUnmount) return
      this.forceUpdate()
    })
  }

  handleChange(index, value) {
    const { formDatum, name } = this.props
    formDatum.set(`${name}[${index}]`, value)
  }

  render() {
    const {
      children, formDatum, name, empty, defaultValue,
    } = this.props

    const errors = formDatum.getError(name)
    const result = []

    if (typeof children !== 'function') {
      return (
        <Provider value={{ path: name, val: this.validate }}>
          {children}
          {
            errors instanceof Error &&
            <FieldError key="error" error={errors} />
          }
        </Provider>
      )
    }

    let values = formDatum.get(name) || defaultValue || []
    if (values && !Array.isArray(values)) values = [values]
    if (values.length === 0 && empty) {
      result.push(empty(this.handleInsert.bind(this, 0)))
    } else {
      const errorList = Array.isArray(errors) ? errors : []
      values.forEach((v, i) => {
        const error = errorList[i]
        result.push((
          <Provider key={i} value={{ path: `${name}[${i}]`, val: this.validate }}>
            {
              children({
                list: values,
                value: formDatum.get(`${name}[${i}]`),
                index: i,
                error,
                onChange: this.handleChange.bind(this, i),
                onInsert: this.handleInsert.bind(this, i),
                onAppend: this.handleInsert.bind(this, i + 1),
                onRemove: this.handleRemove.bind(this, i),
              })
            }
          </Provider>
        ))
      })
    }

    if (errors instanceof Error) {
      result.push(<FieldError key="error" error={errors} />)
    }

    return result
  }
}

FieldSet.propTypes = {
  children: PropTypes.any,
  defaultValue: PropTypes.array,
  empty: PropTypes.func,
  formDatum: PropTypes.object.isRequired,
  name: PropTypes.string.isRequired,
  rules: PropTypes.array,
}

FieldSet.defaultProps = {
  rules: [],
}

export const fieldSetConsumer = Origin => props => (
  <Consumer>
    {({ path, val } = {}) => (
      <Origin
        {...props}
        name={extendName(path, props.name)}
        innerFormNamePath={path}
        fieldSetValidate={val}
      />
    )}
  </Consumer>
)

export default fieldSetConsumer(FieldSet)
