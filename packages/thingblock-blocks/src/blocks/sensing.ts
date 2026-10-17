/**
 * Visual Blocks Editor
 *
 * Copyright 2016 Massachusetts Institute of Technology
 * All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import * as Blockly from 'blockly/core'

Blockly.Blocks.sensing_askandwait = {
  init: function (this: Blockly.Block) {
    this.jsonInit({
      message0: Blockly.Msg.SENSING_ASKANDWAIT,
      args0: [
        {
          type: 'input_value',
          name: 'QUESTION',
        },
      ],
      extensions: ['colours_sensing', 'shape_statement'],
    })
  },
}

Blockly.Blocks.sensing_answer = {
  init: function (this: Blockly.Block) {
    this.jsonInit({
      message0: Blockly.Msg.SENSING_ANSWER,
      extensions: ['colours_sensing', 'output_number', 'monitor_block'],
    })
  },
}

Blockly.Blocks.sensing_keypressed = {
  init: function (this: Blockly.Block) {
    this.jsonInit({
      message0: Blockly.Msg.SENSING_KEYPRESSED,
      args0: [
        {
          type: 'input_value',
          name: 'KEY_OPTION',
        },
      ],
      extensions: ['colours_sensing', 'output_boolean'],
    })
  },
}

Blockly.Blocks.sensing_keyoptions = {
  init: function (this: Blockly.Block) {
    this.jsonInit({
      message0: '%1',
      args0: [
        {
          type: 'field_dropdown',
          name: 'KEY_OPTION',
          options: [
            [Blockly.Msg.EVENT_WHENKEYPRESSED_SPACE, 'space'],
            [Blockly.Msg.EVENT_WHENKEYPRESSED_UP, 'up arrow'],
            [Blockly.Msg.EVENT_WHENKEYPRESSED_DOWN, 'down arrow'],
            [Blockly.Msg.EVENT_WHENKEYPRESSED_RIGHT, 'right arrow'],
            [Blockly.Msg.EVENT_WHENKEYPRESSED_LEFT, 'left arrow'],
            [Blockly.Msg.EVENT_WHENKEYPRESSED_ANY, 'any'],
            ['a', 'a'],
            ['b', 'b'],
            ['c', 'c'],
            ['d', 'd'],
            ['e', 'e'],
            ['f', 'f'],
            ['g', 'g'],
            ['h', 'h'],
            ['i', 'i'],
            ['j', 'j'],
            ['k', 'k'],
            ['l', 'l'],
            ['m', 'm'],
            ['n', 'n'],
            ['o', 'o'],
            ['p', 'p'],
            ['q', 'q'],
            ['r', 'r'],
            ['s', 's'],
            ['t', 't'],
            ['u', 'u'],
            ['v', 'v'],
            ['w', 'w'],
            ['x', 'x'],
            ['y', 'y'],
            ['z', 'z'],
            ['0', '0'],
            ['1', '1'],
            ['2', '2'],
            ['3', '3'],
            ['4', '4'],
            ['5', '5'],
            ['6', '6'],
            ['7', '7'],
            ['8', '8'],
            ['9', '9'],
          ],
        },
      ],
      extensions: ['colours_sensing', 'output_string'],
    })
  },
}

Blockly.Blocks.sensing_mousedown = {
  init: function (this: Blockly.Block) {
    this.jsonInit({
      message0: Blockly.Msg.SENSING_MOUSEDOWN,
      extensions: ['colours_sensing', 'output_boolean'],
    })
  },
}

Blockly.Blocks.sensing_mousex = {
  init: function (this: Blockly.Block) {
    this.jsonInit({
      message0: Blockly.Msg.SENSING_MOUSEX,
      extensions: ['colours_sensing', 'output_number'],
    })
  },
}

Blockly.Blocks.sensing_mousey = {
  init: function (this: Blockly.Block) {
    this.jsonInit({
      message0: Blockly.Msg.SENSING_MOUSEY,
      extensions: ['colours_sensing', 'output_number'],
    })
  },
}

Blockly.Blocks.sensing_timer = {
  init: function (this: Blockly.Block) {
    this.jsonInit({
      message0: Blockly.Msg.SENSING_TIMER,
      extensions: ['colours_sensing', 'output_number', 'monitor_block'],
    })
  },
}

Blockly.Blocks.sensing_resettimer = {
  init: function (this: Blockly.Block) {
    this.jsonInit({
      message0: Blockly.Msg.SENSING_RESETTIMER,
      extensions: ['colours_sensing', 'shape_statement'],
    })
  },
}

Blockly.Blocks.sensing_current = {
  init: function (this: Blockly.Block) {
    this.jsonInit({
      message0: Blockly.Msg.SENSING_CURRENT,
      args0: [
        {
          type: 'field_dropdown',
          name: 'CURRENTMENU',
          options: [
            [Blockly.Msg.SENSING_CURRENT_YEAR, 'YEAR'],
            [Blockly.Msg.SENSING_CURRENT_MONTH, 'MONTH'],
            [Blockly.Msg.SENSING_CURRENT_DATE, 'DATE'],
            [Blockly.Msg.SENSING_CURRENT_DAYOFWEEK, 'DAYOFWEEK'],
            [Blockly.Msg.SENSING_CURRENT_HOUR, 'HOUR'],
            [Blockly.Msg.SENSING_CURRENT_MINUTE, 'MINUTE'],
            [Blockly.Msg.SENSING_CURRENT_SECOND, 'SECOND'],
          ],
        },
      ],
      extensions: ['colours_sensing', 'output_number', 'monitor_block'],
    })
  },
}

Blockly.Blocks.sensing_dayssince2000 = {
  init: function (this: Blockly.Block) {
    this.jsonInit({
      message0: Blockly.Msg.SENSING_DAYSSINCE2000,
      extensions: ['colours_sensing', 'output_number'],
    })
  },
}

Blockly.Blocks.sensing_online = {
  init: function (this: Blockly.Block) {
    this.jsonInit({
      message0: Blockly.Msg.SENSING_ONLINE,
      extensions: ['colours_sensing', 'output_boolean', 'monitor_block'],
    })
  },
}
