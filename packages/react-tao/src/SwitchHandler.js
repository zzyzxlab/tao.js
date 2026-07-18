import React from 'react';
import PropTypes from 'prop-types';
import cartesian from 'cartesian';

import { normalizeClean, handlerHash } from './helpers';

import { Context } from './Provider';
import RenderHandler from './RenderHandler';

export default class SwitchHandler extends React.Component {
  static contextType = Context;

  static propTypes = {
    term: PropTypes.any,
    action: PropTypes.any,
    orient: PropTypes.any,
    debug: PropTypes.bool,
    children: PropTypes.node.isRequired,
  };

  constructor(props) {
    super(props);
    this._adaptedChildren = new Map();
    // Wave key for the AppCon currently being handled (inline handlers only).
    // Avoid intercept+setState: Kernel awaits intercepts, which yields before
    // inline handlers and can leave the UI stuck on an empty chosenList.
    this._currentWave = null;
    this._chosenAccumulator = null;
    this.state = { chosenList: new Set() };
  }

  componentDidMount() {
    const { debug = false } = this.props;
    debug &&
      console.log('SwitchHandler::componentDidMount::props:', this.props);
    const { TAO } = this.context;
    const defaultTrigram = normalizeClean(this.props);
    React.Children.forEach(this.props.children, (child) => {
      if (child.type === RenderHandler) {
        const childTrigram = normalizeClean(child.props);
        const childHash = handlerHash(childTrigram);
        const handler = this.handleSwitch(childHash);
        const trigrams = { ...defaultTrigram, ...childTrigram };
        debug && console.log('trigrams:', trigrams);
        const permutations = cartesian(trigrams);
        debug && console.log('permutations:', permutations);
        this._adaptedChildren.set(child, { permutations, handler });
        permutations.forEach((trigram) => {
          TAO.addInlineHandler(trigram, handler);
        });
      }
    });
    debug &&
      console.log('SwitchHandler::componentDidMount::complete:', {
        adaptedChildren: this._adaptedChildren,
      });
  }

  componentWillUnmount() {
    const { TAO } = this.context;
    this._adaptedChildren.forEach(({ permutations, handler }) => {
      permutations.forEach((trigram) => {
        TAO.removeInlineHandler(trigram, handler);
      });
    });
  }

  handleSwitch = (childHash) => (tao, data) => {
    const { debug = false } = this.props;
    const waveKey = `${tao.t}|${tao.a}|${tao.o}`;
    debug &&
      console.log('SwitchHandler::handleSwitch:', {
        tao,
        data,
        childHash,
        waveKey,
      });
    if (this._currentWave !== waveKey) {
      this._currentWave = waveKey;
      this._chosenAccumulator = new Set();
    }
    this._chosenAccumulator.add(childHash);
    const chosenList = this._chosenAccumulator;
    this.setState({ chosenList, tao, data });
    debug &&
      console.log('SwitchHandler::handleSwitch::set state with:', {
        chosenList,
        tao,
        data,
      });
  };

  render() {
    const { debug = false } = this.props;
    debug && console.log('SwitchHandler::render::state:', this.state);
    const { term, action, orient, children } = this.props;
    const { chosenList } = this.state;
    return React.Children.map(children, (child) => {
      if (!React.isValidElement(child) || child.type !== RenderHandler) {
        debug && console.log('SwitchHandler::render:returning child');
        return child;
      }
      debug && console.log('SwitchHandler::render:testing child');
      const childHash = handlerHash(normalizeClean(child.props));
      if (chosenList.has(childHash)) {
        debug && console.log('SwitchHandler::render:cloning child');
        // shouldRender: the matching AppCon already fired; freshly mounted
        // RenderHandlers would otherwise miss it and stay blank.
        return React.cloneElement(child, {
          term,
          action,
          orient,
          ...child.props,
          shouldRender: true,
        });
      }
      return null;
    });
  }
}
