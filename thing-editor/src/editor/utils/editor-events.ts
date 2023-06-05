import { EventEmitter } from "events";
import { Container } from "pixi.js";
import { EditablePropertyDesc } from "thing-editor/src/editor/props-editor/editable";
import TypedEventEmitter from "typed-emitter";

type EditorEvents = {
	didProjectOpen: () => void,
	beforePropertyChanged: (o: Container, fieldName: string, field: EditablePropertyDesc, val: any, isDelta?: boolean) => void,
	afterPropertyChanged: (o: Container, fieldName: string, field: EditablePropertyDesc, val: any, isDelta?: boolean) => void,
}

//@ts-ignore
const editorEvents = new EventEmitter() as TypedEventEmitter<EditorEvents>;

export { editorEvents };
