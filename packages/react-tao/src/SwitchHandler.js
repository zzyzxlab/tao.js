import React, { Component } from 'react';
import { AppCtx } from '@tao.js/core';
import cartesian from 'cartesian';

import { normalizeAC, cleanInput } from './helpers';

import { Context } from './Provider';
import RenderHandler from './RenderHandler';

export default class SwitchHandler extends Component {
  static contextType = Context;

  constructor(props) {
    super(props);
    this._adaptedChildren = new Map();
    this.state = { chosenList: new Set() };
  }

  componentWillMount() {
    console.log('SwitchHandler::componentWillMount::props:', this.props);
    const { TAO } = this.context;
    const defaultTrigram = cleanInput(normalizeAC(this.props));
    const intercepted = new Map();
    React.Children.forEach(this.props.children, child => {
      if (child.type === RenderHandler) {
        const childTrigram = cleanInput(normalizeAC(child.props));
        const handler = this.handleSwitch(child);
        const trigrams = Object.assign(defaultTrigram, childTrigram);
        console.log('trigrams:', trigrams);
        const permutations = cartesian(trigrams);
        console.log('permutations:', permutations);
        this._adaptedChildren.set(child, { permutations, handler });
        permutations.forEach(trigram => {
          const ac = new AppCtx(trigram.term, trigram.action, trigram.orient);
          TAO.addInlineHandler(trigram, handler);
          if (!intercepted.has(ac.key)) {
            TAO.addInterceptHandler(trigram, this.handleClear);
            intercepted.set(ac.key, true);
          }
        });
      }
    });
    console.log('SwitchHandler::componentWillMount::complete:', {
      intercepted,
      adaptedChildren: this._adaptedChildren
    });
  }

  componentWillUnmount() {
    const { TAO } = this.context;
    this._adaptedChildren.forEach(({ permutations, handler }, child) => {
      permutations.forEach(trigram => {
        TAO.removeInlineHandler(trigram, handler);
        TAO.removeInterceptHandler(trigram, this.handleClear);
      });
    });
  }

  handleClear = (tao, data) => {
    console.log('SwitchHandler::handleClear:', { tao, data });
    const chosenList = new Set();
    this.setState({ chosenList });
  };

  handleSwitch = child => (tao, data) => {
    console.log('SwitchHandler::handleSwitch:', { tao, data });
    const { chosenList } = this.state;
    console.log('chosenList:', chosenList);
    chosenList.add(child);
    this.setState({ chosenList });
    console.log('SwitchHandler::handleSwitch::set state with:', this.state);
  };

  render() {
    console.log('SwitchHandler::render::state:', this.state);
    const { term, action, orient, children } = this.props;
    const { chosenList } = this.state;
    return React.Children.map(children, child => {
      if (!React.isValidElement(child) || child.type !== RenderHandler) {
        console.log('SwitchHandler::render:returning child');
        return child;
      }
      console.log('SwitchHandler::render:testing child');
      if (chosenList.has(child)) {
        console.log('SwitchHandler::render:cloning child');
        return React.cloneElement(child, {
          term,
          action,
          orient,
          ...child.props
        });
      }
    });
  }
}
