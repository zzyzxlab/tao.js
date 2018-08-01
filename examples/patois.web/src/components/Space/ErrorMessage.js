import React from 'react';
import './error.css';

class SpaceErrorMessage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      message: this.errorMessage(props)
    };
  }

  updateState = () => {
    this.setState((prevState, props) => {
      return {
        message: this.errorMessage(props)
      };
    });
  };

  handleAcknowledge = () => {
    this.setState({
      message: ''
    });
  };

  UNSAFE_componentWillReceiveProps(nextProps) {
    this.updateState();
  }

  errorMessage(props) {
    const {
      Space: { name },
      Fail: { on, message }
    } = props;
    if (!on) {
      return '';
    }
    return `Failed to ${on} Space ${name} with '${message}'`;
  }

  render() {
    const { message: displayText } = this.state;
    if (!displayText) {
      return null;
    }
    return (
      <div className="errorMsg">
        {displayText}
        <button onClick={this.handleAcknowledge}>X</button>
      </div>
    );
  }
}

export default SpaceErrorMessage;
