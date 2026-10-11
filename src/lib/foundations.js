import { board } from './examples.js';

const quiz = (question, options, answer, why) => ({ question, options, answer, why });
const emptyBoard = () => ({ parts: [board()], wires: [] });

export const FOUNDATION_LESSONS = [
  {
    id: 'intro-electronics',
    title: 'Introduction to Electronics',
    level: 'Beginner',
    minutes: 4,
    summary: 'Learn what electronics is and how everyday devices use electrical energy and signals.',
    learn: ['Electrical energy and signals', 'Inputs, processing, and outputs', 'Basic circuit vocabulary'],
    setup: emptyBoard,
    solution: null,
    steps: [
      {
        title: 'Electronics is all around you',
        body: 'Electronics is the use of electrical energy and signals to make devices do useful things. Phones, calculators, toys, computers, and LED lamps all use electronic circuits.',
      },
      {
        title: 'A simple way to think about a device',
        body: 'Many devices follow a simple pattern: an **input** provides information (like a button or sensor), a circuit processes that information, and an **output** does something (like lighting an LED or making a sound).',
      },
      {
        title: 'Circuits need a complete path',
        body: 'A basic circuit uses a power source, a conducting path, and a component that uses energy. Electricity can flow around a complete, closed path. A gap usually stops the flow.',
      },
      {
        title: 'Quick check',
        body: 'Check the most important idea from this lesson.',
        quiz: quiz('What does a simple circuit need so current can flow?', ['A complete, closed path', 'Only a battery', 'A wire that stops before the component', 'A switch that is always open'], 0, 'A closed path lets current travel from the source, through the components, and back to the source.'),
      },
    ],
  },
  {
    id: 'components-basics',
    title: 'Electronic Components',
    level: 'Beginner',
    minutes: 5,
    summary: 'Meet the common parts you will use and learn the job each one does in a circuit.',
    learn: ['Power sources and wires', 'Resistors, LEDs, and switches', 'Inputs and outputs'],
    setup: emptyBoard,
    solution: null,
    steps: [
      {
        title: 'Components are circuit building blocks',
        body: 'Each component has a job. A **battery** or bench supply provides energy. **Wires** connect parts. A **resistor** limits current. An **LED** turns electrical energy into light. A **switch** opens or closes a path.',
      },
      {
        title: 'Some parts have a direction',
        body: 'An LED is a type of diode. It normally lets current pass in one direction, so its positive side (**anode**) and negative side (**cathode**) matter. A resistor is not directional in a basic circuit.',
      },
      {
        title: 'Components can sense or control',
        body: 'A sensor responds to something in the world, such as light. A transistor can act like an electronic switch. A motor changes electrical energy into movement. You do not need to memorize every part yet—learn one job at a time.',
      },
      {
        title: 'Quick check',
        body: 'Choose the component that matches the job.',
        quiz: quiz('Why is a resistor commonly placed in series with an LED?', ['To limit the current', 'To create more battery voltage', 'To make the LED change colour automatically', 'To replace the power source'], 0, 'An LED can be damaged by too much current. A suitable series resistor helps limit the current to a safer level.'),
      },
    ],
  },
  {
    id: 'circuit-fundamentals',
    title: 'Understanding Electric Circuits',
    level: 'Beginner',
    minutes: 5,
    summary: 'Understand a circuit as a complete path with a source, connections, and a load.',
    learn: ['Sources, conductors, and loads', 'Open and closed circuits', 'Why shorts are a problem'],
    setup: emptyBoard,
    solution: null,
    steps: [
      {
        title: 'Know the three basic parts',
        body: 'A **source** provides electrical energy, a **conducting path** connects the parts, and a **load** uses the energy. An LED, lamp, buzzer, or motor can act as a load.',
      },
      {
        title: 'Open versus closed',
        body: 'A **closed circuit** has an unbroken path, so current can flow. An **open circuit** has a gap—for example, an open switch—so the path is broken and the load turns off.',
      },
      {
        title: 'Avoid short circuits',
        body: 'A **short circuit** creates an unintended low-resistance path, often around the load. This can cause excessive current, heat, or damage. Never connect the positive and negative terminals of a real power source directly together.',
      },
      {
        title: 'Quick check',
        body: 'Use the circuit vocabulary you just learned.',
        quiz: quiz('A switch is open. What normally happens to the current in that simple series path?', ['It stops flowing', 'It doubles', 'It changes into resistance', 'It flows only through the battery casing'], 0, 'Opening the switch breaks the path. With no complete route, the simple circuit current stops.'),
      },
    ],
  },
  {
    id: 'series-parallel',
    title: 'Series and Parallel Circuits',
    level: 'Beginner',
    minutes: 6,
    summary: 'Compare one-path series circuits with circuits that have more than one branch.',
    learn: ['One path versus branches', 'How current behaves', 'Where series and parallel are used'],
    setup: emptyBoard,
    solution: null,
    steps: [
      {
        title: 'Series means one path',
        body: 'In a **series circuit**, components follow one another in a single path. The same current passes through every component. If one component opens and breaks the path, the whole path stops conducting.',
      },
      {
        title: 'Parallel means branches',
        body: 'In a **parallel circuit**, current has separate branches to travel through. Each branch connected across the same two supply points has the same voltage across it. If one branch opens, another branch can still work.',
      },
      {
        title: 'A quick comparison',
        body: 'Think of series as one road with every car using it. Parallel is like several roads between the same two places. Neither arrangement is automatically better; the best choice depends on what the circuit should do.',
      },
      {
        title: 'Quick check',
        body: 'Choose the circuit that matches the description.',
        quiz: quiz('Two LEDs are connected on separate branches across the same battery. What type of circuit is this?', ['Parallel', 'Series', 'Open only', 'A short circuit by definition'], 0, 'Separate branches connected across the same two supply points form a parallel circuit.'),
      },
    ],
  },
  {
    id: 'switch-control',
    title: 'Switches and Circuit Control',
    level: 'Beginner',
    minutes: 4,
    summary: 'Learn how switches start, stop, and change the behavior of a circuit.',
    learn: ['Open and closed switch states', 'Push buttons and toggle switches', 'Safe circuit control'],
    setup: emptyBoard,
    solution: null,
    steps: [
      {
        title: 'A switch controls the path',
        body: 'A switch changes how parts are connected. In a simple on/off circuit, a **closed switch** completes the path and an **open switch** breaks it.',
      },
      {
        title: 'Different switches suit different jobs',
        body: 'A **push button** is often active only while you press it, like a doorbell. A **toggle switch** stays in its selected position, like a desk lamp switch. Some switches can select between two different paths.',
      },
      {
        title: 'Control is not the same as power',
        body: 'A switch usually controls whether a path is connected; it does not create electrical energy. Start simulations with a low, appropriate supply voltage and avoid shorting a real battery or supply.',
      },
      {
        title: 'Quick check',
        body: 'Check your understanding of switch states.',
        quiz: quiz('In a basic on/off circuit, which switch state completes the path?', ['Closed', 'Open', 'Removed from the circuit', 'Disconnected at both ends'], 0, 'A closed switch connects its contacts and completes the current path.'),
      },
    ],
  },
  {
    id: 'component-connections',
    title: 'Connecting Electronic Components',
    level: 'Beginner',
    minutes: 5,
    summary: 'Learn how rows, holes, component legs, and jumper wires form electrical connections.',
    learn: ['Shared connection points', 'Jumper wires', 'Polarity and common mistakes'],
    setup: emptyBoard,
    solution: null,
    steps: [
      {
        title: 'A connection is more than touching',
        body: 'Two leads are electrically connected when they share the same conductive node. On a breadboard, the hidden metal clips create some of these connections for you. Two parts can look close but still be electrically separate.',
      },
      {
        title: 'Use jumper wires to join nodes',
        body: 'A jumper wire connects one hole or terminal to another. Use it to link a power rail to a component, connect two separate breadboard strips, or complete a path. A wire should connect the intended points—not cross randomly over the board.',
      },
      {
        title: 'Check every lead',
        body: 'Make sure component legs are seated in the intended holes. For an LED, check the anode and cathode. For a resistor, confirm the value. For a powered circuit, trace the path from positive, through the load, and back to negative.',
      },
      {
        title: 'Quick check',
        body: 'Think about what makes two holes part of the same connection.',
        quiz: quiz('On a standard mini breadboard, which holes are usually connected together?', ['The five holes in one numbered strip on one side of the centre gap', 'Every hole in the entire board', 'All holes across the centre gap', 'Only holes with matching colours of component'], 0, 'A typical mini breadboard connects each group of five holes on one side of the centre gap. The two sides remain separate.'),
      },
    ],
  },
  {
    id: 'logic-gates',
    title: 'AND, OR, and NOT Gates',
    level: 'Beginner',
    minutes: 5,
    summary: 'Meet the three basic logic gates and learn how they turn binary inputs into an output.',
    learn: ['Binary 0 and 1', 'AND, OR, and NOT behavior', 'Inputs and outputs'],
    setup: emptyBoard,
    solution: null,
    steps: [
      {
        title: 'Digital logic uses two states',
        body: 'A digital circuit often treats a signal as **0** (LOW/OFF) or **1** (HIGH/ON). A logic gate follows a rule that turns one or more input states into an output state.',
      },
      {
        title: 'Three basic rules',
        body: '**AND** outputs 1 only when every input is 1. **OR** outputs 1 when at least one input is 1. **NOT** has one input and flips it: 0 becomes 1, and 1 becomes 0.',
      },
      {
        title: 'Everyday examples',
        body: 'An AND rule might require both a key and a start button. An OR rule might let either of two buttons turn on a lamp. A NOT rule can represent a signal that is active when a sensor is not detecting something.',
      },
      {
        title: 'Quick check',
        body: 'Use the rule for an AND gate.',
        quiz: quiz('An AND gate has inputs A = 1 and B = 0. What is the output?', ['0', '1', '2', 'The output is always changing'], 0, 'AND needs all inputs to be 1. Because B is 0, the output is 0.'),
      },
    ],
  },
  {
    id: 'truth-tables',
    title: 'Logic Gate Truth Tables',
    level: 'Beginner',
    minutes: 6,
    summary: 'Read a truth table row by row to predict the output of a logic gate.',
    learn: ['Input combinations', 'AND and OR tables', 'NOT table'],
    setup: emptyBoard,
    solution: null,
    steps: [
      {
        title: 'What is a truth table?',
        body: 'A **truth table** lists every possible input combination and the output that a logic rule produces. For two inputs, A and B, there are four combinations: 00, 01, 10, and 11.',
      },
      {
        title: 'Compare AND and OR',
        body: 'For an **AND** gate, outputs for AB = 00, 01, 10, 11 are **0, 0, 0, 1**. For an **OR** gate, the outputs are **0, 1, 1, 1**. Only the last AND row is 1, while OR is 1 whenever either input is 1.',
      },
      {
        title: 'NOT has one input',
        body: 'A **NOT** gate uses one input. Its two rows are: input 0 → output 1, and input 1 → output 0. When reading any truth table, find the row matching the inputs first, then read the output column.',
      },
      {
        title: 'Quick check',
        body: 'Pick the correct output for the given input row.',
        quiz: quiz('For an OR gate, A = 0 and B = 1. What is the output?', ['1', '0', 'Both 0 and 1 at once', 'There is no output'], 0, 'OR outputs 1 when at least one input is 1. Here, B is 1, so the output is 1.'),
      },
    ],
  },
  {
    id: 'basic-logic-circuit',
    title: 'Building a Basic Logic Circuit',
    level: 'Beginner',
    minutes: 7,
    summary: 'Plan a two-input logic circuit, follow its truth table, and predict when an output should turn on.',
    learn: ['Choose a logic rule', 'Map inputs to an output', 'Test cases using a truth table'],
    setup: emptyBoard,
    solution: null,
    steps: [
      {
        title: 'Plan before connecting',
        body: 'Start with a clear goal. For this exercise, two inputs (**A** and **B**) control one output (**Y**). Imagine that an LED represents the output: Y = 1 means the LED should be on, and Y = 0 means it should be off.',
      },
      {
        title: 'Choose the AND rule',
        body: 'Use an **AND** rule: the LED should turn on only when both A and B are 1. The truth table is **A B → Y: 00 → 0, 01 → 0, 10 → 0, 11 → 1**. This table is the plan for your circuit.',
      },
      {
        title: 'Test each input combination',
        body: 'Check all four rows, not just the one that turns the output on. If only A is on, Y stays 0. If only B is on, Y stays 0. When both are on, Y becomes 1. This is how you verify that a logic design follows its rule.',
      },
      {
        title: 'Quick check',
        body: 'Confirm the final row of the truth table.',
        quiz: quiz('For the AND circuit, when should the LED (output Y) turn on?', ['Only when A = 1 and B = 1', 'Whenever A = 1, no matter what B is', 'Whenever either input is 1', 'When both inputs are 0'], 0, 'An AND output becomes 1 only if every input is 1, so the LED turns on only for A = 1 and B = 1.'),
      },
    ],
  },
];
