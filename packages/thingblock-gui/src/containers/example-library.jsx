import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React from 'react';
import {defineMessages, injectIntl} from 'react-intl';
import {connect} from 'react-redux';
import VM from '@thingblock/thingblock-vm';
import intlShape from '../lib/intlShape.js';
import log from '../lib/log';

import LibraryComponent from '../components/library/library.jsx';
import ExampleCard from '../components/example-card/example-card.jsx';
import {closeExampleLibrary} from '../reducers/modals';

const messages = defineMessages({
    title: {
        defaultMessage: 'Examples',
        description: 'Heading for the library of example projects bundled with the editor',
        id: 'gui.exampleLibrary.title'
    }
});

/** Labels for the example groups the resource pack's index uses, keyed by the index's group name. */
const groupMessages = defineMessages({
    'K12 cơ bản': {
        defaultMessage: 'K12 basics',
        description: 'Example library tag: basic lessons from the K1-K12 curriculum',
        id: 'gui.exampleLibrary.groupK12'
    },
    'Âm nhạc': {
        defaultMessage: 'Music',
        description: 'Example library tag: tunes played on the ThingBot buzzer',
        id: 'gui.exampleLibrary.groupMusic'
    },
    'Mô phỏng ThingBot Sim': {
        defaultMessage: 'ThingBot Sim lessons',
        description: 'Example library tag: the lessons of the ThingBot simulator',
        id: 'gui.exampleLibrary.groupSim'
    },
    'CoBot': {
        defaultMessage: 'CoBot',
        description: 'Example library tag: the CoBot line-following robot of the Maker Village',
        id: 'gui.exampleLibrary.groupCoBot'
    },
    'FanRoc': {
        defaultMessage: 'FanRoc',
        description: 'Example library tag: competition robot samples for the FanRoc contest',
        id: 'gui.exampleLibrary.groupFanRoc'
    }
});

/**
 * The library of example projects the resource pack ships (`examples/index.json` under the pack's
 * examples base). Choosing one hands its `.tb` URL and title to `onSelectExample`, which opens it
 * through the same path as loading a project from the computer.
 */
class ExampleLibrary extends React.PureComponent {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleItemSelect',
            'renderItem'
        ]);
        this.state = {base: null, index: null};
    }
    componentDidMount () {
        if (this.props.visible) this.fetchIndex();
    }
    componentDidUpdate (prevProps) {
        if (this.props.visible && !prevProps.visible) this.fetchIndex();
    }
    fetchIndex () {
        const base = this.props.vm.devices.getExamplesOrigin();
        if (!base || (this.state.index && this.state.base === base)) return;
        fetch(`${base}/index.json`)
            .then(response => {
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                return response.json();
            })
            .then(index => this.setState({base, index}))
            .catch(error => log.warn(`ExampleLibrary: could not load ${base}/index.json: ${error.message}`));
    }
    handleItemSelect (item) {
        this.props.onSelectExample({url: `${this.state.base}/${item.file}`, title: item.title});
    }
    renderItem (item, key, onSelect) {
        return (
            <ExampleCard
                key={key}
                description={item.description}
                group={groupMessages[item.group] ?
                    this.props.intl.formatMessage(groupMessages[item.group]) : item.group}
                hardware={item.hardware}
                itemKey={key}
                level={item.level}
                name={item.title}
                onSelect={onSelect}
            />
        );
    }
    render () {
        if (!this.props.visible) return null;
        const {index} = this.state;
        const data = index ? index.examples.map(example => ({
            ...example,
            name: example.title,
            tags: [example.group]
        })) : [];
        // A group the editor has no label for is shown by its index name.
        const tags = index ? index.groups.map(group => ({
            tag: group,
            intlLabel: groupMessages[group] || {id: 'gui.exampleLibrary.groupOther', defaultMessage: group}
        })) : [];
        return (
            <LibraryComponent
                data={data}
                id="exampleLibrary"
                renderItem={this.renderItem}
                tags={tags}
                title={this.props.intl.formatMessage(messages.title)}
                onItemSelected={this.handleItemSelect}
                onRequestClose={this.props.onRequestClose}
            />
        );
    }
}

ExampleLibrary.propTypes = {
    intl: intlShape.isRequired,
    onRequestClose: PropTypes.func,
    onSelectExample: PropTypes.func.isRequired,
    visible: PropTypes.bool,
    vm: PropTypes.instanceOf(VM).isRequired
};

const mapStateToProps = state => ({
    visible: state.scratchGui.modals.exampleLibrary,
    vm: state.scratchGui.vm
});

const mapDispatchToProps = dispatch => ({
    onRequestClose: () => dispatch(closeExampleLibrary())
});

export default injectIntl(connect(
    mapStateToProps,
    mapDispatchToProps
)(ExampleLibrary));
