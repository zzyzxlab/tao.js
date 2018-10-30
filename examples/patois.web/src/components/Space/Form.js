import React, { Component } from 'react';
import TAO from '@tao.js/core';

class SpaceForm extends Component {
  constructor(props) {
    super(props);
    this.state = Object.assign(
      {
        name: '',
        description: ''
      },
      props.Space
    );
  }

  handleChange = event => {
    const target = event.target;
    const val = target.type === 'checkbox' ? target.checked : target.value;
    const name = target.name;
    this.setState({
      [name]: val
    });
  };

  handleSubmit = event => {
    const { a } = this.props;
    const Space = this.state;
    const isNew = a === 'New';
    const saveAction = isNew ? 'Add' : 'Update';
    TAO.setCtx({ t: 'Space', a: saveAction, o: 'Portal' }, { Space });
    event.preventDefault();
  };

  handleCancel = event => {
    event.preventDefault();
    const { Space: { _id } = {} } = this.props;
    TAO.setCtx({ t: 'Space', a: 'Find', o: 'Portal' }, { Find: { _id } });
  };

  render() {
    const { a } = this.props;
    const Space = this.state;
    const isNew = a === 'New';
    return (
      <div>
        <h1>
          {a} Space {Space.name ? `- ${Space.name}` : ''}
        </h1>
        <form name={`${a}Space`} onSubmit={this.handleSubmit}>
          {isNew ? null : <input type="hidden" name="id" value={Space.id} />}
          <label htmlFor="name">Name:</label>
          <input
            type="text"
            name="name"
            value={Space.name}
            onChange={this.handleChange}
          />
          <br />
          <label htmlFor="description">Description:</label>
          <textarea
            name="description"
            value={Space.description}
            onChange={this.handleChange}
          />
          <br />
          <input type="submit" value="Save" />
          &nbsp;
          <button onClick={this.handleCancel}>Cancel</button>
        </form>
      </div>
    );
  }
}

export default SpaceForm;
