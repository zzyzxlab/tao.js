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
    // Stryker disable next-line BooleanLiteral: debug defaults false; logging is optional
    const { debug = false } = this.props;
    // Stryker disable all: optional debug logging
    debug &&
      console.log('SwitchHandler::componentDidMount::props:', this.props);
    // Stryker restore all
    const { TAO } = this.context;
    const defaultTrigram = normalizeClean(this.props);
    React.Children.forEach(this.props.children, (child) => {
      if (child.type === RenderHandler) {
        const childTrigram = normalizeClean(child.props);
        const childHash = handlerHash(childTrigram);
        const handler = this.handleSwitch(childHash);
        const trigrams = { ...defaultTrigram, ...childTrigram };
        // Stryker disable all: optional debug logging
        debug && console.log('trigrams:', trigrams);
        // Stryker restore all
        const permutations = cartesian(trigrams);
        // Stryker disable all: optional debug logging
        debug && console.log('permutations:', permutations);
        // Stryker restore all
        this._adaptedChildren.set(child, { permutations, handler });
        permutations.forEach((trigram) => {
          TAO.addInlineHandler(trigram, handler);
        });
      }
    });
    // Stryker disable all: optional debug logging
    debug &&
      console.log('SwitchHandler::componentDidMount::complete:', {
        adaptedChildren: this._adaptedChildren,
      });
    // Stryker restore all
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
    // Stryker disable next-line BooleanLiteral: debug defaults false; logging is optional
    const { debug = false } = this.props;
    const waveKey = `${tao.t}|${tao.a}|${tao.o}`;
    // Stryker disable all: optional debug logging
    debug &&
      console.log('SwitchHandler::handleSwitch:', {
        tao,
        data,
        childHash,
        waveKey,
      });
    // Stryker restore all
    if (this._currentWave !== waveKey) {
      this._currentWave = waveKey;
      this._chosenAccumulator = new Set();
    }
    this._chosenAccumulator.add(childHash);
    const chosenList = this._chosenAccumulator;
    this.setState({ chosenList, tao, data });
    // Stryker disable all: optional debug logging
    debug &&
      console.log('SwitchHandler::handleSwitch::set state with:', {
        chosenList,
        tao,
        data,
      });
    // Stryker restore all
  };

  render() {
    // Stryker disable next-line BooleanLiteral: debug defaults false; logging is optional
    const { debug = false } = this.props;
    // Stryker disable all: optional debug logging
    debug && console.log('SwitchHandler::render::state:', this.state);
    // Stryker restore all
    const { term, action, orient, children } = this.props;
    const { chosenList } = this.state;
    return React.Children.map(children, (child) => {
      if (!React.isValidElement(child) || child.type !== RenderHandler) {
        // Stryker disable all: optional debug logging
        debug && console.log('SwitchHandler::render:returning child');
        // Stryker restore all
        return child;
      }
      // Stryker disable all: optional debug logging
      debug && console.log('SwitchHandler::render:testing child');
      // Stryker restore all
      const childHash = handlerHash(normalizeClean(child.props));
      if (chosenList.has(childHash)) {
        // Stryker disable all: optional debug logging
        debug && console.log('SwitchHandler::render:cloning child');
        // Stryker restore all
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
