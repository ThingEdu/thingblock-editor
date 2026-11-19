import type { ReactNode } from 'react'
import { defineMessages, FormattedMessage, type MessageDescriptor } from 'react-intl'
import addSoundCheckpoints from './icon--add-sound-checkpoints.svg'
import askForHelp from './icon--ask-for-help.svg'
import breakItDown from './icon--break-it-down.svg'
import checkCodeSequence from './icon--check-code-sequence.svg'
import checkTheValues from './icon--check-the-values.svg'
import commentYourCode from './icon--comment-your-code.svg'
import readAloud from './icon--read-aloud.svg'
import slowItDown from './icon--slow-it-down.svg'
import takeABreak from './icon--take-a-break.svg'
import thinkAboutBlockOptions from './icon--think-about-block-options.svg'
import timingAndParallelism from './icon--timing-and-parallelism.svg'
import tinkerWithBlockOrder from './icon--tinker-with-block-order.svg'
import toLoopOrNotToLoop from './icon--to-loop-or-not.svg'

const messages = defineMessages({
  readAloudTitle: {
    defaultMessage: 'Read Aloud',
    description: 'title for the "read aloud" section',
    id: 'gui.debugModal.readAloud.title',
  },
  readAloudDescription1: {
    defaultMessage: 'As you read your code aloud, think from the computer’s perspective.',
    description: 'description for the "read aloud" section of the debug modal',
    id: 'gui.debugModal.readAloud.description1',
  },
  readAloudDescription2: {
    defaultMessage: 'Are you including steps that aren’t there?',
    description: 'description for the "read aloud" section of the debug modal',
    id: 'gui.debugModal.readAloud.description2',
  },
  readAloudDescription3: {
    defaultMessage: 'Are your instructions clear?',
    description: 'description for the "read aloud" section of the debug modal',
    id: 'gui.debugModal.readAloud.description3',
  },
  readAloudDescription4: {
    defaultMessage: 'If something needs to be reset each time the program has run, are those instructions included?',
    description: 'description for the "read aloud" section of the debug modal',
    id: 'gui.debugModal.readAloud.description4',
  },
  breakItDownTitle: {
    defaultMessage: 'Break It Down',
    description: 'title for the "break it down" section',
    id: 'gui.debugModal.breakItDown.title',
  },
  breakItDownDescription1: {
    defaultMessage:
      'Separate the blocks into smaller chunks (or sequences), and click to see what each sequence does.',
    description: 'description for the "break it down" section of the debug modal',
    id: 'gui.debugModal.breakItDown.description1',
  },
  breakItDownDescription2: {
    defaultMessage: 'Once the smaller sequences work as you expect, add them back into the main program.',
    description: 'description for the "break it down" section of the debug modal',
    id: 'gui.debugModal.breakItDown.description2',
  },
  breakItDownDescription3: {
    defaultMessage: 'The process is called decomposition.',
    description: 'description for the "break it down" section of the debug modal',
    id: 'gui.debugModal.breakItDown.description3',
  },
  slowItDownTitle: {
    defaultMessage: 'Slow It Down',
    description: 'title for the "slow it down" section',
    id: 'gui.debugModal.slowItDown.title',
  },
  slowItDownDescription1: {
    defaultMessage: 'The computer runs your program so quickly it can be hard to follow with your eyes.',
    description: 'description for the "slow it down" section of the debug modal',
    id: 'gui.debugModal.slowItDown.description1',
  },
  slowItDownDescription2: {
    defaultMessage:
      'Add temporary “wait” or “wait until” blocks to slow down the sequence. This gives you time to process if a piece worked or not.',
    description: 'description for the "slow it down" section of the debug modal',
    id: 'gui.debugModal.slowItDown.description2',
  },
  slowItDownDescription3: {
    defaultMessage: 'Remove these wait blocks once your code works.',
    description: 'description for the "slow it down" section of the debug modal',
    id: 'gui.debugModal.slowItDown.description3',
  },
  addSoundCheckpointsTitle: {
    defaultMessage: 'Add Sound Checkpoints',
    description: 'title for the "add sound checkpoints" section',
    id: 'gui.debugModal.addSoundCheckpoints.title',
  },
  addSoundCheckpointsDescription1: {
    defaultMessage:
      'Similar to the Slow It Down strategy, you can add different sounds with the “play until done” block at key points to test your sequence.',
    description: 'description for the "add sound checkpoints" section of the debug modal',
    id: 'gui.debugModal.addSoundCheckpoints.description1',
  },
  addSoundCheckpointsDescription2: {
    defaultMessage:
      'If a sound doesn’t play, your bug may be before this block. If the sound plays, the bug is probably after this block.',
    description: 'description for the "add sound checkpoints" section of the debug modal',
    id: 'gui.debugModal.addSoundCheckpoints.description2',
  },
  addSoundCheckpointsDescription3: {
    defaultMessage: 'Remove the sounds once your code works.',
    description: 'description for the "add sound checkpoints" section of the debug modal',
    id: 'gui.debugModal.addSoundCheckpoints.description3',
  },
  tinkerWithBlockOrderTitle: {
    defaultMessage: 'Tinker with Block Order',
    description: 'title for the "tinker with block order" section',
    id: 'gui.debugModal.tinkerWithBlockOrder.title',
  },
  tinkerWithBlockOrderDescription1: {
    defaultMessage: 'Try adjusting the order/sequence of the blocks.',
    description: 'description for the "tinker with block order" section of the debug modal',
    id: 'gui.debugModal.tinkerWithBlockOrder.description1',
  },
  tinkerWithBlockOrderDescription2: {
    defaultMessage: 'What needs to happen first?',
    description: 'description for the "tinker with block order" section of the debug modal',
    id: 'gui.debugModal.tinkerWithBlockOrder.description2',
  },
  tinkerWithBlockOrderDescription3: {
    defaultMessage: 'What happens second?',
    description: 'description for the "tinker with block order" section of the debug modal',
    id: 'gui.debugModal.tinkerWithBlockOrder.description3',
  },
  tinkerWithBlockOrderDescription4: {
    defaultMessage: 'Do values or sprites need to reset before the next piece of code runs?',
    description: 'description for the "tinker with block order" section of the debug modal',
    id: 'gui.debugModal.tinkerWithBlockOrder.description4',
  },
  tinkerWithBlockOrderDescription5: {
    defaultMessage:
      'Try using blocks inside a loop or conditional statement, versus outside a loop or conditional statement.',
    description: 'description for the "tinker with block order" section of the debug modal',
    id: 'gui.debugModal.tinkerWithBlockOrder.description5',
  },
  toLoopOrNotTitle: {
    defaultMessage: 'To Loop or Not to Loop',
    description: 'title for the "tinker with block order" section',
    id: 'gui.debugModal.toLoopOrNot.title',
  },
  toLoopOrNotDescription1: {
    defaultMessage:
      'If using Control blocks like "forever" and "repeat", check that all blocks inside a loop should be there, or if a block (like “wait”) is missing to reset the action or adjust the timing. Do you want your loop to run forever or for a certain number of times? Should something stop the looping?',
    description: 'description for the "to loop or not to loop" section of the debug modal',
    id: 'gui.debugModal.toLoopOrNot.description1',
  },
  toLoopOrNotDescription2: {
    defaultMessage:
      'Perhaps you aren\'t using a loop when you should be? For instance, if you are using a conditional statement block like "if then," does the program only need to check if it is true or false once? Or does it need to check continuously, in which case, you would want to place your conditional statement inside a forever loop?',
    description: 'description for the "to loop or not to loop" section of the debug modal',
    id: 'gui.debugModal.toLoopOrNot.description2',
  },
  timingAndParallelismTitle: {
    defaultMessage: 'Think About Timing & Parallelism',
    description: 'title for the "think about timing and parallelism" section',
    id: 'gui.debugModal.timingAndParallelism.title',
  },
  timingAndParallelismSectionTitle: {
    defaultMessage: 'Timing & Parallelism',
    description: 'title for the "think about timing and parallelism" sidebar section',
    id: 'gui.debugModal.timingAndParallelism.sectionTitle',
  },
  timingAndParallelismDescription1: {
    defaultMessage:
      'Do you have multiple events trying to run at the same time? If two sequences are programmed to start at the same time, you can get unpredictable behavior.',
    description: 'description for the "think about timing and parallelism" section of the debug modal',
    id: 'gui.debugModal.timingAndParallelism.description1',
  },
  timingAndParallelismDescription2: {
    defaultMessage:
      'Add small waits, broadcasts, or user interaction (like clicking or pressing a key) to see if this affects the result.',
    description: 'description for the "think about timing and parallelism" section of the debug modal',
    id: 'gui.debugModal.timingAndParallelism.description2',
  },
  thinkAboutBlockOptionsTitle: {
    defaultMessage: 'Think About Block Options',
    description: 'title for the "think about block options" section',
    id: 'gui.debugModal.thinkAboutBlockOptions.title',
  },
  thinkAboutBlockOptionsDescription1: {
    defaultMessage: 'Is there a similar but different block you can use?',
    description: 'description for the "think about block options" section of the debug modal',
    id: 'gui.debugModal.thinkAboutBlockOptions.description1',
  },
  thinkAboutBlockOptionsDescription2: {
    defaultMessage:
      'Some blocks look similar but can behave differently, such as “set” vs “change” or “play until done” vs “start.”',
    description: 'description for the "think about block options" section of the debug modal',
    id: 'gui.debugModal.thinkAboutBlockOptions.description2',
  },
  thinkAboutBlockOptionsDescription3: {
    defaultMessage: 'Try using a similar block in place of what you have, and see if this affects the result.',
    description: 'description for the "think about block options" section of the debug modal',
    id: 'gui.debugModal.thinkAboutBlockOptions.description3',
  },
  checkTheValuesTitle: {
    defaultMessage: 'Check the Values',
    description: 'title for the "check the value" section',
    id: 'gui.debugModal.checkTheValues.title',
  },
  checkTheValuesDescription1: {
    defaultMessage:
      'If you are using variables or reporter blocks, check the value at the moment the code sequence is run.',
    description: 'description for the "check the values" section of the debug modal',
    id: 'gui.debugModal.checkTheValues.description1',
  },
  checkTheValuesDescription2: {
    defaultMessage: 'Do/should all the sprites control a variable, or should only one sprite have control?',
    description: 'description for the "check the values" section of the debug modal',
    id: 'gui.debugModal.checkTheValues.description2',
  },
  checkTheValuesDescription3: {
    defaultMessage: 'Where is the value reset? Where is it changed?',
    description: 'description for the "check the values" section of the debug modal',
    id: 'gui.debugModal.checkTheValues.description3',
  },
  checkCodeSequenceTitle: {
    defaultMessage: 'Check Code Sequence',
    description: 'title for the "check code sequence" section',
    id: 'gui.debugModal.checkCodeSequence.title',
  },
  checkCodeSequenceDescription1: {
    defaultMessage:
      'Check that your code sequence is attached to the correct sprite or the backdrop, if appropriate.',
    description: 'description for the "check code sequence" section of the debug modal',
    id: 'gui.debugModal.checkCodeSequence.description1',
  },
  checkCodeSequenceDescription2: {
    defaultMessage:
      'If you need to move your code to another sprite, click and drag it until you are hovering over the correct sprite. Release it once the sprite wiggles.',
    description: 'description for the "check code sequence" section of the debug modal',
    id: 'gui.debugModal.checkCodeSequence.description2',
  },
  commentYourCodeTitle: {
    defaultMessage: 'Comment Your Code',
    description: 'title for the "comment your code" section',
    id: 'gui.debugModal.commentYourCode.title',
  },
  commentYourCodeDescription1: {
    defaultMessage:
      'Adding comments to your code can help others looking at your code to understand it. It can also help you remember how your code works when you come back to it later.',
    description: 'description for the "comment your code" section of the debug modal',
    id: 'gui.debugModal.commentYourCode.description1',
  },
  commentYourCodeDescription2: {
    defaultMessage:
      'Right click on script area to “Add Comment.” Use everyday language to explain what a block, or small sequence of blocks, does.',
    description: 'description for the "comment your code" section of the debug modal',
    id: 'gui.debugModal.commentYourCode.description2',
  },
  takeABreakTitle: {
    defaultMessage: 'Take a Break, Step Away',
    description: 'title for the "take a break" section',
    id: 'gui.debugModal.takeABreak.title',
  },
  takeABreakDescription1: {
    defaultMessage: 'Sometimes, spending too much time focused on an issue can be counterproductive and frustrating.',
    description: 'description for the "take a break, step away" section of the debug modal',
    id: 'gui.debugModal.takeABreak.description1',
  },
  takeABreakDescription2: {
    defaultMessage:
      'Take a break and step away from the screen to clear your mind. After some rest, focusing on something else, or getting some water, you can approach the problem with fresh eyes.',
    description: 'description for the "take a break, step away" section of the debug modal',
    id: 'gui.debugModal.takeABreak.description2',
  },
  askForHelpTitle: {
    defaultMessage: 'Ask for Help',
    description: 'title for the "ask for help" section',
    id: 'gui.debugModal.askForHelp.title',
  },
  askForHelpDescription1: {
    defaultMessage:
      'If you are still stuck, you can ask for help from a peer. Try finding a debugging/help studio and share your project, asking for help in a comment or the project notes.',
    description: 'description for the "ask for help" section of the debug modal',
    id: 'gui.debugModal.askForHelp.description1',
  },
  askForHelpDescription2: {
    defaultMessage:
      'Ask one to three people to try your code, as different people may have different perspectives or solutions!',
    description: 'description for the "ask for help" section of the debug modal',
    id: 'gui.debugModal.askForHelp.description2',
  },
})

/** One debugging tip. */
export interface Section {
  id: string
  title: MessageDescriptor
  /** A shorter title for the topic list, where the title is too long. */
  sectionTitle?: MessageDescriptor
  description: ReactNode
  image: string
}

/** The debugging tips, in the order the modal shows them. */
export const sections: Section[] = [
  {
    id: 'readAloud',
    title: messages.readAloudTitle,
    description: (
      <div>
        <p>
          <FormattedMessage {...messages.readAloudDescription1} />
        </p>
        <ul>
          <li>
            <FormattedMessage {...messages.readAloudDescription2} />
          </li>
          <li>
            <FormattedMessage {...messages.readAloudDescription3} />
          </li>
          <li>
            <FormattedMessage {...messages.readAloudDescription4} />
          </li>
        </ul>
      </div>
    ),
    image: readAloud,
  },
  {
    id: 'breakItDown',
    title: messages.breakItDownTitle,
    description: (
      <div>
        <p>
          <FormattedMessage {...messages.breakItDownDescription1} />
        </p>
        <p>
          <FormattedMessage {...messages.breakItDownDescription2} />
        </p>
        <p>
          <FormattedMessage {...messages.breakItDownDescription3} />
        </p>
      </div>
    ),
    image: breakItDown,
  },
  {
    id: 'slowItDown',
    title: messages.slowItDownTitle,
    description: (
      <div>
        <p>
          <FormattedMessage {...messages.slowItDownDescription1} />
        </p>
        <p>
          <FormattedMessage {...messages.slowItDownDescription2} />
        </p>
        <p>
          <FormattedMessage {...messages.slowItDownDescription3} />
        </p>
      </div>
    ),
    image: slowItDown,
  },
  {
    id: 'addSoundCheckpoints',
    title: messages.addSoundCheckpointsTitle,
    description: (
      <div>
        <p>
          <FormattedMessage {...messages.addSoundCheckpointsDescription1} />
        </p>
        <p>
          <FormattedMessage {...messages.addSoundCheckpointsDescription2} />
        </p>
        <p>
          <FormattedMessage {...messages.addSoundCheckpointsDescription3} />
        </p>
      </div>
    ),
    image: addSoundCheckpoints,
  },
  {
    id: 'tinkerWithBlockOrder',
    title: messages.tinkerWithBlockOrderTitle,
    description: (
      <div>
        <p>
          <FormattedMessage {...messages.tinkerWithBlockOrderDescription1} />
        </p>
        <ul>
          <li>
            <FormattedMessage {...messages.tinkerWithBlockOrderDescription2} />
          </li>
          <li>
            <FormattedMessage {...messages.tinkerWithBlockOrderDescription3} />
          </li>
          <li>
            <FormattedMessage {...messages.tinkerWithBlockOrderDescription4} />
          </li>
        </ul>
        <p>
          <FormattedMessage {...messages.tinkerWithBlockOrderDescription5} />
        </p>
      </div>
    ),
    image: tinkerWithBlockOrder,
  },
  {
    id: 'toLoopOrNotToLoop',
    title: messages.toLoopOrNotTitle,
    description: (
      <div>
        <p>
          <FormattedMessage {...messages.toLoopOrNotDescription1} />
        </p>
        <p>
          <FormattedMessage {...messages.toLoopOrNotDescription2} />
        </p>
      </div>
    ),
    image: toLoopOrNotToLoop,
  },
  {
    id: 'timingAndParallelism',
    title: messages.timingAndParallelismTitle,
    sectionTitle: messages.timingAndParallelismSectionTitle,
    description: (
      <div>
        <p>
          <FormattedMessage {...messages.timingAndParallelismDescription1} />
        </p>
        <p>
          <FormattedMessage {...messages.timingAndParallelismDescription2} />
        </p>
      </div>
    ),
    image: timingAndParallelism,
  },
  {
    id: 'thinkAboutBlockOptions',
    title: messages.thinkAboutBlockOptionsTitle,
    description: (
      <div>
        <p>
          <FormattedMessage {...messages.thinkAboutBlockOptionsDescription1} />
        </p>
        <p>
          <FormattedMessage {...messages.thinkAboutBlockOptionsDescription2} />
        </p>
        <p>
          <FormattedMessage {...messages.thinkAboutBlockOptionsDescription3} />
        </p>
      </div>
    ),
    image: thinkAboutBlockOptions,
  },
  {
    id: 'checkTheValues',
    title: messages.checkTheValuesTitle,
    description: (
      <div>
        <p>
          <FormattedMessage {...messages.checkTheValuesDescription1} />
        </p>
        <ul>
          <li>
            <FormattedMessage {...messages.checkTheValuesDescription2} />
          </li>
          <li>
            <FormattedMessage {...messages.checkTheValuesDescription3} />
          </li>
        </ul>
      </div>
    ),
    image: checkTheValues,
  },
  {
    id: 'checkCodeSequence',
    title: messages.checkCodeSequenceTitle,
    description: (
      <div>
        <p>
          <FormattedMessage {...messages.checkCodeSequenceDescription1} />
        </p>
        <p>
          <FormattedMessage {...messages.checkCodeSequenceDescription2} />
        </p>
      </div>
    ),
    image: checkCodeSequence,
  },
  {
    id: 'commentYourCode',
    title: messages.commentYourCodeTitle,
    description: (
      <div>
        <p>
          <FormattedMessage {...messages.commentYourCodeDescription1} />
        </p>
        <p>
          <FormattedMessage {...messages.commentYourCodeDescription2} />
        </p>
      </div>
    ),
    image: commentYourCode,
  },
  {
    id: 'takeABreak',
    title: messages.takeABreakTitle,
    description: (
      <div>
        <p>
          <FormattedMessage {...messages.takeABreakDescription1} />
        </p>
        <p>
          <FormattedMessage {...messages.takeABreakDescription2} />
        </p>
      </div>
    ),
    image: takeABreak,
  },
  {
    id: 'askForHelp',
    title: messages.askForHelpTitle,
    description: (
      <div>
        <p>
          <FormattedMessage {...messages.askForHelpDescription1} />
        </p>
        <p>
          <FormattedMessage {...messages.askForHelpDescription2} />
        </p>
      </div>
    ),
    image: askForHelp,
  },
]
