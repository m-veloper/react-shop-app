import React, {useState} from 'react'
import {Checkbox, Collapse} from 'antd';

const {Panel} = Collapse


function CheckBox(props) {

  const [Checked, setChecked] = useState([])

  const handleToggle = (value) => {
    // 누른것의 index를 구하고,
    // 전체 Checked state 에서 햊 누른 Checkbox가 이미 있다면 빼주고 state 에 넣어준다

    const currentIndex = Checked.indexOf(value); // 값이 -1 이라면 체크된 값이 없는것.
    const newChecked = [...Checked];

    if (currentIndex === -1) {
      newChecked.push(value)
    } else {
      newChecked.splice(currentIndex, 1)
    }

    setChecked(newChecked)
    props.handleFilters(newChecked)
    //update this checked information into Parent Component

  }

  const renderCheckboxLists = () => props.list && props.list.map((value, index) => (
    <React.Fragment key={index}>
      <Checkbox
        onChange={() => handleToggle(value._id)}
        type="checkbox"
        checked={Checked.indexOf(value._id) === -1 ? false : true}
      />&nbsp;&nbsp;
      <span>{value.name}</span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
    </React.Fragment>
  ))

  return (
    <div>
      <Collapse defaultActiveKey={['0']}>
        <Panel header="Continents" key="1">
          {renderCheckboxLists()}
        </Panel>
      </Collapse>
    </div>
  )
}

export default CheckBox
