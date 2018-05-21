import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import TestRenderer from 'react-test-renderer';
// import { mount } from 'enzyme';
import { AppCtx } from '@tao.js/core';
import Kernel from '@tao.js/core/build/Kernel';
import Provider from '../build/Provider';
import Reactor from '../build/Reactor';

const TERM = 'colleague';
const ACTION = 'hug';
const ORIENT = 'justfriends';

const ALT_TERM = 'dude';
const ALT_ACTION = 'fistbump';
const ALT_ORIENT = 'bros';

let TAO = null;
function initTAO() {
  TAO = new Kernel();
}
function clearTAO() {
  TAO = null;
}

const TestComponentA = props => <div id={props[TERM].id}>Test Component A</div>;
const TestComponentB = props => (
  <div name={props[ALT_ACTION].name}>Test Component B</div>
);

beforeEach(initTAO);
afterEach(clearTAO);

describe('Reactor exports a React Component for reacting to TAO App Contexts', () => {
  it('should provide a constructor that inherits from React.Component', () => {
    // Assemble
    // Act
    // Assert
    expect(Reactor).toBeDefined();
    expect(new Reactor()).toBeInstanceOf(Reactor);
    expect(new Reactor()).not.toBeInstanceOf(Function);
    expect(new Reactor()).toBeInstanceOf(Component);
  });

  it('should not render a component without an AC being triggered', () => {
    // Assemble
    const provider = new Provider(TAO);
    // Act
    const testRender = TestRenderer.create(<Reactor provider={provider} />);
    const root = testRender.root;
    // Assert
    expect(testRender.toJSON()).toBeNull();
  });

  it('should render a component set as a Handler for an AC', () => {
    // Assemble
    const provider = new Provider(TAO);
    const triggerAc1 = new AppCtx(TERM, ACTION, ORIENT, [{ id: 1 }]);
    const triggerAc2 = new AppCtx(TERM, ALT_ACTION, ORIENT, {
      a: { name: 'doooood' }
    });
    provider.addComponentHandler(triggerAc1.unwrapCtx(true), TestComponentA);
    provider.addComponentHandler(triggerAc2.unwrapCtx(true), TestComponentB, {
      css: 'hey'
    });
    // const reactor = <Reactor provider={provider} />;
    // Act
    const testRender = TestRenderer.create(<Reactor provider={provider} />);
    const preTrigger = testRender.toJSON();
    // console.log('pre.tree:', testRender.toTree());
    console.log('pre.children:', testRender.root.children);
    TAO.setAppCtx(triggerAc1);
    testRender.update(<Reactor provider={provider} />);
    // console.log('post1.tree:', testRender.toTree());
    console.log('post1.children:', testRender.root.children);
    console.log('testRender1:', testRender.toJSON());

    const post1 = testRender.root.findByType(TestComponentA);
    TAO.setAppCtx(triggerAc2);
    testRender.update(<Reactor provider={provider} />);
    // console.log('post2.tree:', testRender.toTree());
    console.log('post2.children:', testRender.root.children);
    console.log('testRender2:', testRender.toJSON());
    const post2 = testRender.root.findByType(TestComponentB);

    // Assert
    expect(preTrigger).toBeNull();
    // console.log('testRender:', testRender.toJSON());
    expect(post1).toBeDefined();
    // console.log('post1.tree:', post1.toTree());
    // console.log('post1.instance:', post1.instance);
    // expect(post1.instance.props).toMatchObject({
    //   t: TERM,
    //   a: ACTION,
    //   o: ORIENT,
    //   [TERM]: { id: 1 }
    // });
    expect(post2).toBeDefined();
    // expect(post1.type).toBe('TestComponentB');
  });
});
