import React, { Fragment } from "react"
import { List, Map } from "immutable"
import { things, nodes, enumerations, LABEL, inheritance } from "./schema"

import Form, {
	FormValue,
	Constant,
	Reference,
	Inline,
	FormValueType,
	FormValues,
	FormProps,
} from "./form"
import { constants } from "./constants"

interface PropertyViewProps {
	path: string[]
	formValue: FormValue
	graph: Map<string, string[]>
	createNode: (types: string[]) => string
	onChange: (value: FormValue, newId?: string, newForm?: FormValues) => void
}

function renderInline(props: PropertyViewProps) {
	const { createNode, formValue } = props
	const id = props.path.join("/")
	const graph = props.graph.set(id, [formValue.type])
	const onChange = (inline, newId, newForm) => {
		props.onChange(formValue.with({ inline }), newId, newForm)
	}
	const form = formValue.inline
	const formProps: FormProps = { createNode, graph, id, onChange, form }
	return (
		<Fragment>
			<br />
			<Form {...formProps} />
		</Fragment>
	)
}

export default function PropertyView(props: PropertyViewProps) {
	const { createNode, formValue, onChange } = props
	const { value, type } = formValue
	if (constants.hasOwnProperty(type) && value === Constant) {
		const { props, getValue, setValue } = constants[type]
		return (
			<input
				{...props.merge(setValue(formValue.constant)).toJS()}
				onChange={event =>
					onChange(formValue.with({ constant: getValue(event) }))
				}
				onKeyDown={event => event.keyCode === 13 && event.preventDefault()}
			/>
		)
	} else if (things.has(type)) {
		const inherited = inheritance[type]
		const objects: List<[string, string[]]> = List(
			props.graph
				.entrySeq()
				.filter(([_, types]: [string, string[]]) =>
					types.some(t => inherited.has(t))
				)
		)
		const hasObjects = objects.size > 0
		const hasEnumerations = enumerations.hasOwnProperty(type)
		const disabled = !hasObjects && !hasEnumerations
		const label = nodes[type][LABEL]
		const defaultValue = hasObjects
			? objects.get(0)[0]
			: hasEnumerations
				? Array.from(enumerations[type])[0]
				: ""
		const radio = (valueType: FormValueType) => ({
			type: "radio",
			name: props.path.join("/"),
			value: valueType.toString(),
			checked: value === valueType,
			onChange({ target: { value } }) {
				const newValue = formValue.with({ value })
				if (value === Inline && newValue.inline === null) {
					onChange(newValue.with({ inline: Map({}) }))
				} else {
					onChange(newValue)
				}
			},
		})
		return (
			<Fragment>
				<div>
					<input {...radio(Reference)} disabled={disabled} />
					<select
						disabled={disabled || value !== Reference}
						value={formValue.reference || defaultValue}
						onChange={event => {
							event.preventDefault()
							const reference = event.target.value
							const props = { value: Reference, reference, inline: null }
							onChange(formValue.with(props))
						}}
					>
						{disabled && <option value="">No {label} objects found.</option>}
						{Array.from(enumerations[type] || []).map((id, key) => (
							<option key={-(key + 1)} value={id}>
								{nodes[id][LABEL]}
							</option>
						))}
						{objects.map(([id], key) => (
							<option key={key} value={id}>
								{id}
							</option>
						))}
					</select>
				</div>
				<div>
					<input {...radio(Inline)} />
					<select disabled={inherited.size === 1 || value === Reference}>
						{Array.from(inherited).map((subtype, key) => (
							<option key={key}>{nodes[subtype][LABEL]}</option>
						))}
					</select>
					<input
						className="split"
						type="button"
						value={`Split into new object`}
						disabled={value === Reference}
						onClick={event => {
							event.preventDefault()
							const reference = createNode([type])
							const inline: FormValues = Map({})
							const values = { value: Reference, reference, inline }
							onChange(
								formValue.with(values),
								reference,
								props.formValue.inline
							)
						}}
					/>
					{value === Inline && renderInline(props)}
				</div>
			</Fragment>
		)
	} else {
		return <span>"Cannot enter this kind of value yet"</span>
	}
}
