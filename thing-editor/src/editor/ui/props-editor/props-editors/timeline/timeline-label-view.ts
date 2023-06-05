import { ClassAttributes, Component, ComponentChild } from "preact";
import R from "thing-editor/src/editor/preact-fabrics";
import ObjectsTimelineView from "thing-editor/src/editor/ui/props-editor/props-editors/timeline/objects-timeline";
import Timeline from "thing-editor/src/editor/ui/props-editor/props-editors/timeline/timeline";
import type { TimelineSelectable } from "thing-editor/src/editor/ui/props-editor/props-editors/timeline/timeline-selectable";
import copyTextByClick from "thing-editor/src/editor/utils/copy-text-by-click";
import sp from "thing-editor/src/editor/utils/stop-propagation";
import { TimelineLabelData } from "thing-editor/src/engine/components/movie-clip/field-player";
import MovieClip from "thing-editor/src/engine/components/movie-clip/movie-clip.c";
import game from "thing-editor/src/engine/game";

let labelNamesProps = {
	className: 'selectable-text',
	title: 'Ctrl+click to copy field`s name',
	onMouseDown: copyTextByClick
};

const labelStartMarkerProps = {
	className: 'timeline-label-pointer'
};

interface TimelineLabelViewProps extends ClassAttributes<TimelineLabelView> {
	label: TimelineLabelData;
	labelName: string //TODO remove??
	owner: ObjectsTimelineView;
	labelsNamesList: string[];
}

interface TimelineLabelViewState {
	isSelected?: boolean;
}

export default class TimelineLabelView extends Component<TimelineLabelViewProps, TimelineLabelViewState> implements TimelineSelectable {

	onDraggableMouseDown: (ev: PointerEvent) => void;
	isSelected: boolean = false;

	constructor(props: TimelineLabelViewProps) {
		super(props);
		this.onDoubleClick = this.onDoubleClick.bind(this);
		this.onLabelMouseDown = this.onLabelMouseDown.bind(this);
		this.onDraggableMouseDown = Timeline.onDraggableMouseDown.bind(this);
	}

	componentDidMount() {
		Timeline._justModifiedSelectable(this);
		this.props.label.___view = this;
	}

	componentWillReceiveProps(props: TimelineLabelViewProps) {

		let k1 = this.props.label;
		let k2 = props.label;
		if(k1.___view === this) {
			k1.___view = null;
		}
		k2.___view = this;

		if(this.props.label.t !== props.label.t) {
			Timeline._justModifiedSelectable(this);
		}
	}


	componentWillUnmount() {
		Timeline.unregisterDraggableComponent(this);
	}

	getTime() {
		return this.props.label.t;
	}

	setTime(time: number) {
		const label = this.props.label;

		if(label.t !== time) {
			label.t = time;
			this.onChanged();
		}
	}

	onChanged() {
		this.props.owner.onLabelChange(this.props.label);
	}

	deleteLabel() {
		let name = this.props.labelName;
		game.editor.ui.modal.showEditorQuestion('Label removing', 'Delete Label "' + name + '"?', () => {
			Timeline.unselectComponent(this);
			let tl = this.props.owner.props.node._timelineData;
			delete tl.l[name];
			this.onChanged();
		}, R.span(null, R.icon('delete'), ' Delete'));
	}

	onLabelMouseDown(ev: PointerEvent) {
		if(ev.buttons === 2) {
			this.deleteLabel();
			sp(ev);
		} else {
			this.onDraggableMouseDown(ev);
		}
	}

	static renormalizeLabel(label: TimelineLabelData, movieClip: MovieClip) { //re find keyframes for modified label
		label.n = movieClip._timelineData.f.map((fieldTimeline) => {
			return MovieClip._findNextKeyframe(fieldTimeline.t, label.t - 1);
		});
		MovieClip.invalidateSerializeCache(movieClip);
	}

	static renormalizeAllLabels(movieClip: MovieClip) {
		for(let key in movieClip._timelineData.l) {
			if(!movieClip._timelineData.l.hasOwnProperty(key)) continue;
			TimelineLabelView.renormalizeLabel(movieClip._timelineData.l[key], movieClip);
		}
	}

	static askForLabelName(existingLabelsNames: string[], title: ComponentChild, defaultName = '', allowedDuplicateName?: string) {
		return game.editor.ui.modal.showPrompt(title, defaultName, undefined, (nameToCheck: string) => {
			if(nameToCheck === allowedDuplicateName) {
				return;
			}
			if(existingLabelsNames.indexOf(nameToCheck) >= 0) {
				return 'Label with that name already exists.';
			}
		});
	}

	onDoubleClick(ev: PointerEvent) { //rename label by double click
		let tl = this.props.owner.props.node._timelineData;
		let label = this.props.label;
		let name = this.props.labelName;

		TimelineLabelView.askForLabelName(this.props.labelsNamesList, "Rename label", name, name).then((enteredName) => {
			if(enteredName && (name !== enteredName)) {
				tl.l[enteredName] = label;
				delete tl.l[name];
				this.onChanged();
			}
		});
		sp(ev);
	}

	render() {

		let className = 'timeline-label';
		if(this.state && this.state.isSelected) {
			className += ' timeline-label-selected';
		}

		let label = this.props.label;
		let name = this.props.labelName;

		return R.div({
			className, id: 'timeline-label-' + name.replace('.', '-').replace('#', '-'), style: { left: label.t * this.props.owner.props.widthZoom },
			onMouseDown: this.onLabelMouseDown,
			onDoubleClick: this.onDoubleClick
		}, R.div(labelStartMarkerProps), R.span(labelNamesProps, name)
		);
	}
}