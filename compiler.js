/**
 * PseudoIDE — CsbyAbdulbasit
 * IGCSE 0478 / O-Level 2210 Pseudocode Compiler
 * Full-featured: line numbers, autocomplete, error detection,
 * variable trace, file handling sim, all syllabus constructs
 */

"use strict";

// ===================================================================
// DOM REFS
// ===================================================================
const editor         = document.getElementById('editor');
const lineNumbers    = document.getElementById('line-numbers');
const consoleOutput  = document.getElementById('console-output');
const errorsBody     = document.getElementById('errors-body');
const traceBody      = document.getElementById('trace-body');
const errBadge       = document.getElementById('err-badge');
const statusErrors   = document.getElementById('status-errors');
const statusLines    = document.getElementById('status-lines');
const cursorPos      = document.getElementById('cursor-pos');
const acPanel        = document.getElementById('autocomplete-panel');

// ===================================================================
// FONT SIZE
// ===================================================================
let fontSize = 15;
document.getElementById('btn-font-up').addEventListener('click', () => {
  fontSize = Math.min(fontSize + 1, 24);
  editor.style.fontSize = fontSize + 'px';
  updateLineNumbers();
});
document.getElementById('btn-font-down').addEventListener('click', () => {
  fontSize = Math.max(fontSize - 1, 10);
  editor.style.fontSize = fontSize + 'px';
  updateLineNumbers();
});

// ===================================================================
// THEME TOGGLE
// ===================================================================
let isDark = true;
document.getElementById('btn-theme').addEventListener('click', () => {
  isDark = !isDark;
  document.body.classList.toggle('light-theme', !isDark);
  document.getElementById('btn-theme').textContent = isDark ? '🌙' : '☀️';
});

// ===================================================================
// LINE NUMBERS
// ===================================================================
function updateLineNumbers() {
  const lines = editor.value.split('\n');
  const activeLine = getActiveLine();
  const errorLines = getErrorLines();

  lineNumbers.innerHTML = lines.map((_, i) => {
    const n = i + 1;
    let cls = 'ln';
    if (n === activeLine) cls += ' active';
    if (errorLines.has(n)) cls += ' error-line';
    return `<span class="${cls}">${n}</span>`;
  }).join('');

  lineNumbers.scrollTop = editor.scrollTop;
  statusLines.textContent = `${lines.length} line${lines.length !== 1 ? 's' : ''}`;
}

function getActiveLine() {
  const text = editor.value.substring(0, editor.selectionStart);
  return text.split('\n').length;
}

let _errorLineSet = new Set();
function getErrorLines() { return _errorLineSet; }

editor.addEventListener('scroll', () => { lineNumbers.scrollTop = editor.scrollTop; });
editor.addEventListener('keyup',  () => { updateLineNumbers(); updateCursorPos(); liveCheck(); });
editor.addEventListener('click',  () => { updateLineNumbers(); updateCursorPos(); });
editor.addEventListener('input',  () => { updateLineNumbers(); triggerAutocomplete(); });

function updateCursorPos() {
  const text = editor.value.substring(0, editor.selectionStart);
  const lines = text.split('\n');
  cursorPos.textContent = `Ln ${lines.length}, Col ${lines[lines.length - 1].length + 1}`;
}

// Init
updateLineNumbers();

// ===================================================================
// TAB KEY → 4 spaces
// ===================================================================
editor.addEventListener('keydown', (e) => {
  if (e.key === 'Tab') {
    e.preventDefault();
    const s = editor.selectionStart;
    const end = editor.selectionEnd;
    editor.value = editor.value.substring(0, s) + '    ' + editor.value.substring(end);
    editor.selectionStart = editor.selectionEnd = s + 4;
    updateLineNumbers();
  }

  // Autocomplete keyboard nav
  if (acPanel.classList.contains('visible')) {
    const items = acPanel.querySelectorAll('.ac-item');
    let sel = [...items].findIndex(i => i.classList.contains('selected'));
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (sel < items.length - 1) {
        items[sel]?.classList.remove('selected');
        items[sel + 1]?.classList.add('selected');
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (sel > 0) {
        items[sel]?.classList.remove('selected');
        items[sel - 1]?.classList.add('selected');
      }
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      const selItem = acPanel.querySelector('.ac-item.selected');
      if (selItem) { e.preventDefault(); applyAutocomplete(selItem.dataset.insert); }
      else { hideAutocomplete(); }
    } else if (e.key === 'Escape') {
      hideAutocomplete();
    }
  }
});

// ===================================================================
// AUTOCOMPLETE
// ===================================================================
const AC_KEYWORDS = [
  { label: 'DECLARE',        insert: 'DECLARE  : ',           type: 'kw', hint: 'variable declaration' },
  { label: 'CONSTANT',       insert: 'CONSTANT  ← ',         type: 'kw', hint: 'constant declaration' },
  { label: 'INPUT',          insert: 'INPUT ',                type: 'kw', hint: 'read input' },
  { label: 'OUTPUT',         insert: 'OUTPUT ',               type: 'kw', hint: 'print output' },
  { label: 'IF',             insert: 'IF  THEN\n  \nENDIF',  type: 'kw', hint: 'conditional' },
  { label: 'IF...ELSE',      insert: 'IF  THEN\n  \n  ELSE\n  \nENDIF', type: 'kw' },
  { label: 'ELSEIF',         insert: 'ELSEIF  THEN',         type: 'kw' },
  { label: 'ELSE',           insert: 'ELSE',                  type: 'kw' },
  { label: 'ENDIF',          insert: 'ENDIF',                 type: 'kw' },
  { label: 'CASE OF',        insert: 'CASE OF \n  \n  OTHERWISE \nENDCASE', type: 'kw', hint: 'switch/case' },
  { label: 'ENDCASE',        insert: 'ENDCASE',               type: 'kw' },
  { label: 'FOR',            insert: 'FOR  ← 1 TO \n  \nNEXT ', type: 'kw', hint: 'count loop' },
  { label: 'FOR...STEP',     insert: 'FOR  ← 1 TO  STEP 1\n  \nNEXT ', type: 'kw' },
  { label: 'NEXT',           insert: 'NEXT ',                 type: 'kw' },
  { label: 'WHILE',          insert: 'WHILE  DO\n  \nENDWHILE', type: 'kw', hint: 'pre-condition loop' },
  { label: 'ENDWHILE',       insert: 'ENDWHILE',              type: 'kw' },
  { label: 'REPEAT',         insert: 'REPEAT\n  \nUNTIL ',   type: 'kw', hint: 'post-condition loop' },
  { label: 'UNTIL',          insert: 'UNTIL ',                type: 'kw' },
  { label: 'PROCEDURE',      insert: 'PROCEDURE ()\n  \nENDPROCEDURE', type: 'kw' },
  { label: 'ENDPROCEDURE',   insert: 'ENDPROCEDURE',          type: 'kw' },
  { label: 'CALL',           insert: 'CALL ',                 type: 'kw' },
  { label: 'FUNCTION',       insert: 'FUNCTION () RETURNS INTEGER\n  RETURN \nENDFUNCTION', type: 'kw' },
  { label: 'ENDFUNCTION',    insert: 'ENDFUNCTION',           type: 'kw' },
  { label: 'RETURN',         insert: 'RETURN ',               type: 'kw' },
  { label: 'RETURNS',        insert: 'RETURNS ',              type: 'kw' },
  { label: 'OPENFILE',       insert: 'OPENFILE "" FOR WRITE', type: 'kw', hint: 'file open' },
  { label: 'CLOSEFILE',      insert: 'CLOSEFILE ""',          type: 'kw' },
  { label: 'READFILE',       insert: 'READFILE "", ',         type: 'kw' },
  { label: 'WRITEFILE',      insert: 'WRITEFILE "", ',        type: 'kw' },
  { label: 'AND',            insert: 'AND ',                  type: 'kw' },
  { label: 'OR',             insert: 'OR ',                   type: 'kw' },
  { label: 'NOT',            insert: 'NOT ',                  type: 'kw' },
  { label: 'TRUE',           insert: 'TRUE',                  type: 'kw' },
  { label: 'FALSE',          insert: 'FALSE',                 type: 'kw' },
  { label: 'THEN',           insert: 'THEN',                  type: 'kw' },
  { label: 'DO',             insert: 'DO',                    type: 'kw' },
  { label: 'OF',             insert: 'OF',                    type: 'kw' },
  { label: 'OTHERWISE',      insert: 'OTHERWISE ',            type: 'kw' },
  // Types
  { label: 'INTEGER',        insert: 'INTEGER',               type: 'type' },
  { label: 'REAL',           insert: 'REAL',                  type: 'type' },
  { label: 'STRING',         insert: 'STRING',                type: 'type' },
  { label: 'CHAR',           insert: 'CHAR',                  type: 'type' },
  { label: 'BOOLEAN',        insert: 'BOOLEAN',               type: 'type' },
  // Array
  { label: 'ARRAY[1:10] OF INTEGER', insert: 'ARRAY[1:10] OF INTEGER', type: 'type' },
  // Built-in functions
  { label: 'LENGTH()',       insert: 'LENGTH()',               type: 'fn', hint: 'string length' },
  { label: 'UCASE()',        insert: 'UCASE()',                type: 'fn', hint: 'upper case' },
  { label: 'LCASE()',        insert: 'LCASE()',                type: 'fn', hint: 'lower case' },
  { label: 'SUBSTRING()',    insert: 'SUBSTRING(, 1, 1)',      type: 'fn', hint: 'extract substring' },
  { label: 'ROUND()',        insert: 'ROUND(, 2)',             type: 'fn', hint: 'round to decimal' },
  { label: 'RANDOM()',       insert: 'RANDOM()',               type: 'fn', hint: 'random 0..1' },
  { label: 'MOD()',          insert: 'MOD(, )',                type: 'fn', hint: 'modulo remainder' },
  { label: 'DIV()',          insert: 'DIV(, )',                type: 'fn', hint: 'integer division' },
];

function getCurrentWord() {
  const text = editor.value;
  const cursor = editor.selectionStart;
  let start = cursor;
  while (start > 0 && /\w/.test(text[start - 1])) start--;
  return { word: text.substring(start, cursor), start, end: cursor };
}

function triggerAutocomplete() {
  const { word } = getCurrentWord();
  if (!word || word.length < 1) { hideAutocomplete(); return; }
  const matches = AC_KEYWORDS.filter(k => k.label.toUpperCase().startsWith(word.toUpperCase()));
  if (!matches.length) { hideAutocomplete(); return; }

  acPanel.innerHTML = '';
  matches.slice(0, 10).forEach((m, i) => {
    const div = document.createElement('div');
    div.className = 'ac-item' + (i === 0 ? ' selected' : '');
    div.dataset.insert = m.insert;
    div.innerHTML = `<span class="ac-${m.type}">${m.label}</span><span class="ac-type">${m.type}</span>`;
    div.addEventListener('mousedown', (e) => { e.preventDefault(); applyAutocomplete(m.insert); });
    acPanel.appendChild(div);
  });

  // Position near cursor
  const lineHeight = fontSize * 1.6;
  const lines = editor.value.substring(0, editor.selectionStart).split('\n');
  const top = (lines.length) * lineHeight + 20;
  const col = lines[lines.length - 1].length;
  acPanel.style.top = top + 'px';
  acPanel.style.left = Math.min(col * (fontSize * 0.6), 300) + 'px';
  acPanel.classList.add('visible');
}

function applyAutocomplete(insert) {
  const { start, end } = getCurrentWord();
  // Replace current word
  const before = editor.value.substring(0, start);
  const after  = editor.value.substring(end);
  editor.value = before + insert + after;
  editor.selectionStart = editor.selectionEnd = start + insert.length;
  hideAutocomplete();
  updateLineNumbers();
  editor.focus();
}

function hideAutocomplete() {
  acPanel.classList.remove('visible');
}

editor.addEventListener('blur', () => setTimeout(hideAutocomplete, 150));

// ===================================================================
// LIVE ERROR CHECK (syntax hints before run)
// ===================================================================
const LIVE_ERRORS = [];

function liveCheck() {
  LIVE_ERRORS.length = 0;
  _errorLineSet = new Set();
  const lines = editor.value.split('\n');

  // Track structural balance
  let ifCount = 0, forCount = 0, whileCount = 0, repeatCount = 0, procCount = 0, funcCount = 0;

  lines.forEach((rawLine, idx) => {
    const n = idx + 1;
    const line = rawLine.replace(/\/\/.*/g, '').trim().toUpperCase();
    if (!line) return;

    if (/^IF\b/.test(line)) ifCount++;
    if (/^ENDIF$/.test(line)) ifCount--;
    if (/^FOR\b/.test(line)) forCount++;
    if (/^NEXT\b/.test(line)) forCount--;
    if (/^WHILE\b/.test(line)) whileCount++;
    if (/^ENDWHILE$/.test(line)) whileCount--;
    if (/^REPEAT$/.test(line)) repeatCount++;
    if (/^UNTIL\b/.test(line)) repeatCount--;
    if (/^PROCEDURE\b/.test(line)) procCount++;
    if (/^ENDPROCEDURE$/.test(line)) procCount--;
    if (/^FUNCTION\b/.test(line)) funcCount++;
    if (/^ENDFUNCTION$/.test(line)) funcCount--;

    // Missing THEN after IF condition
    if (/^IF\b/.test(line) && !/THEN$/.test(line)) {
      addErr(n, 'IF statement missing THEN keyword', 'Add THEN at the end of the IF condition line');
    }
    // Missing DO after WHILE condition
    if (/^WHILE\b/.test(line) && !/DO$/.test(line)) {
      addErr(n, 'WHILE statement missing DO keyword', 'Add DO at the end of the WHILE condition');
    }
    // DECLARE without colon
    if (/^DECLARE\b/.test(line) && !line.includes(':')) {
      addErr(n, 'DECLARE statement missing colon (:)', 'Format: DECLARE Name : DataType');
    }
    // OUTPUT without value
    if (/^OUTPUT$/.test(line)) {
      addErr(n, 'OUTPUT requires a value or expression', 'e.g. OUTPUT "Hello" or OUTPUT Counter');
    }
  });

  // Check unbalanced structures at end
  if (ifCount !== 0)    addErr(lines.length, `Unbalanced IF/ENDIF (${Math.abs(ifCount)} missing ${ifCount > 0 ? 'ENDIF' : 'IF'})`, 'Check every IF has a matching ENDIF');
  if (forCount !== 0)   addErr(lines.length, `Unbalanced FOR/NEXT (${Math.abs(forCount)} missing ${forCount > 0 ? 'NEXT' : 'FOR'})`, 'Check every FOR has a matching NEXT');
  if (whileCount !== 0) addErr(lines.length, `Unbalanced WHILE/ENDWHILE`, 'Check every WHILE has a matching ENDWHILE');
  if (repeatCount !== 0)addErr(lines.length, `Unbalanced REPEAT/UNTIL`, 'Check every REPEAT has a matching UNTIL');
  if (procCount !== 0)  addErr(lines.length, `Unbalanced PROCEDURE/ENDPROCEDURE`, 'Check every PROCEDURE has ENDPROCEDURE');
  if (funcCount !== 0)  addErr(lines.length, `Unbalanced FUNCTION/ENDFUNCTION`, 'Check every FUNCTION has ENDFUNCTION');

  renderErrors();
  updateLineNumbers();
}

function addErr(line, msg, suggest = '') {
  LIVE_ERRORS.push({ line, msg, suggest });
  _errorLineSet.add(line);
}

function renderErrors() {
  const count = LIVE_ERRORS.length;
  errBadge.textContent = count;
  errBadge.classList.toggle('hidden', count === 0);

  if (count === 0) {
    errorsBody.innerHTML = '<div class="no-errors">✔ No errors detected</div>';
    statusErrors.className = 'status-ok';
    statusErrors.textContent = '✔ No errors';
  } else {
    statusErrors.className = 'status-error';
    statusErrors.textContent = `✕ ${count} error${count > 1 ? 's' : ''}`;
    errorsBody.innerHTML = LIVE_ERRORS.map(e =>
      `<div class="error-item">
        <div class="err-loc">Line ${e.line}</div>
        <div class="err-msg">✕ ${e.msg}</div>
        ${e.suggest ? `<div class="err-suggest">💡 ${e.suggest}</div>` : ''}
      </div>`
    ).join('');
  }
}

// ===================================================================
// OUTPUT TABS
// ===================================================================
document.querySelectorAll('.out-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.out-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.out-content').forEach(c => c.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
  });
});

// ===================================================================
// MODALS
// ===================================================================
document.getElementById('btn-reference').addEventListener('click', () => {
  document.getElementById('modal-reference').classList.add('open');
});
document.getElementById('close-reference').addEventListener('click', () => {
  document.getElementById('modal-reference').classList.remove('open');
});
document.getElementById('btn-tests').addEventListener('click', () => {
  buildTestCards();
  document.getElementById('modal-tests').classList.add('open');
});
document.getElementById('close-tests').addEventListener('click', () => {
  document.getElementById('modal-tests').classList.remove('open');
});
document.querySelectorAll('.modal-overlay').forEach(o => {
  o.addEventListener('click', (e) => { if (e.target === o) o.classList.remove('open'); });
});

// ===================================================================
// CLEAR BUTTON
// ===================================================================
document.getElementById('btn-clear').addEventListener('click', () => {
  editor.value = '';
  consoleOutput.innerHTML = '<div class="console-welcome"><div class="welcome-art">&gt; Cleared. Ready.</div></div>';
  traceBody.innerHTML = '<div class="no-errors">Run code to see variable trace</div>';
  updateLineNumbers();
  liveCheck();
});

// ===================================================================
// DIVIDER RESIZE
// ===================================================================
const divider     = document.getElementById('divider');
const editorPanel = document.getElementById('editor-panel');
let dragging = false;

divider.addEventListener('mousedown', () => { dragging = true; divider.classList.add('dragging'); });
document.addEventListener('mousemove', (e) => {
  if (!dragging) return;
  const workspace = document.querySelector('.workspace');
  const wRect = workspace.getBoundingClientRect();
  let pct = ((e.clientX - wRect.left) / wRect.width) * 100;
  pct = Math.max(25, Math.min(75, pct));
  editorPanel.style.width = pct + '%';
});
document.addEventListener('mouseup', () => { dragging = false; divider.classList.remove('dragging'); });

// ===================================================================
// EXAMPLE CODE SNIPPETS
// ===================================================================
const EXAMPLES = {
  hello: `// Hello World — your first program!
OUTPUT "Hello, World!"
OUTPUT "Welcome to PseudoIDE"`,

  variables: `// Variables, Constants & Data Types
DECLARE Age : INTEGER
DECLARE Price : REAL
DECLARE Grade : CHAR
DECLARE Name : STRING
DECLARE IsPass : BOOLEAN
CONSTANT Pi ← 3.14159
CONSTANT MaxStudents ← 30

Age ← 17
Price ← 9.99
Grade ← 'A'
Name ← "Abdullah"
IsPass ← TRUE

OUTPUT "Name: ", Name
OUTPUT "Age: ", Age
OUTPUT "Price: ", Price
OUTPUT "Grade: ", Grade
OUTPUT "Passed: ", IsPass
OUTPUT "Pi constant: ", Pi`,

  ifelse: `// IF / ELSE / ELSEIF Statements
DECLARE Score : INTEGER
Score ← 75

// Simple IF
IF Score >= 50 THEN
  OUTPUT "You passed!"
ENDIF

// IF-ELSE
IF Score >= 50 THEN
  OUTPUT "Result: PASS"
  ELSE
  OUTPUT "Result: FAIL"
ENDIF

// IF-ELSEIF-ELSE (Grade bands)
IF Score >= 90 THEN
  OUTPUT "Grade: A"
  ELSEIF Score >= 80 THEN
    OUTPUT "Grade: B"
  ELSEIF Score >= 70 THEN
    OUTPUT "Grade: C"
  ELSEIF Score >= 60 THEN
    OUTPUT "Grade: D"
  ELSE
    OUTPUT "Grade: F"
ENDIF`,

  casef: `// CASE Statement
DECLARE Day : INTEGER
Day ← 3

CASE OF Day
  1 : OUTPUT "Monday"
  2 : OUTPUT "Tuesday"
  3 : OUTPUT "Wednesday"
  4 : OUTPUT "Thursday"
  5 : OUTPUT "Friday"
  6 : OUTPUT "Saturday"
  7 : OUTPUT "Sunday"
  OTHERWISE OUTPUT "Invalid day number"
ENDCASE`,

  forloop: `// FOR Loop — Count Controlled
// Basic FOR loop
FOR i ← 1 TO 5
  OUTPUT "Count: ", i
NEXT i

// FOR with STEP
OUTPUT "Even numbers:"
FOR n ← 2 TO 10 STEP 2
  OUTPUT n
NEXT n

// Counting backwards
OUTPUT "Countdown:"
FOR k ← 5 TO 1 STEP -1
  OUTPUT k
NEXT k
OUTPUT "Blast off!"`,

  whileloop: `// WHILE Loop — Pre-Condition
DECLARE Number : INTEGER
Number ← 1

WHILE Number <= 5 DO
  OUTPUT "Number is: ", Number
  Number ← Number + 1
ENDWHILE

// Sum until threshold
DECLARE Total : INTEGER
DECLARE Count : INTEGER
Total ← 0
Count ← 1

WHILE Total < 20 DO
  Total ← Total + Count
  Count ← Count + 1
ENDWHILE
OUTPUT "Total reached: ", Total`,

  repeatloop: `// REPEAT UNTIL — Post-Condition Loop
// Always runs at least once!
DECLARE Guess : INTEGER
Guess ← 0

REPEAT
  OUTPUT "Guess a number between 1-10:"
  INPUT Guess
  IF Guess <> 7 THEN
    OUTPUT "Wrong! Try again."
  ENDIF
UNTIL Guess = 7

OUTPUT "Correct! The answer was 7."`,

  array1d: `// 1D Array Operations
DECLARE Scores : ARRAY[1:5] OF INTEGER

// Assign values
Scores[1] ← 85
Scores[2] ← 92
Scores[3] ← 78
Scores[4] ← 95
Scores[5] ← 88

// Output all elements
OUTPUT "All scores:"
FOR i ← 1 TO 5
  OUTPUT "Scores[", i, "] = ", Scores[i]
NEXT i

// Find total and average
DECLARE Total : INTEGER
DECLARE Average : REAL
Total ← 0

FOR i ← 1 TO 5
  Total ← Total + Scores[i]
NEXT i

Average ← Total / 5
OUTPUT "Total: ", Total
OUTPUT "Average: ", Average

// Find maximum value
DECLARE Max : INTEGER
Max ← Scores[1]
FOR i ← 2 TO 5
  IF Scores[i] > Max THEN
    Max ← Scores[i]
  ENDIF
NEXT i
OUTPUT "Highest score: ", Max`,

  array2d: `// 2D Array — Multiplication Table
DECLARE Table : ARRAY[1:3, 1:3] OF INTEGER

// Fill the 2D array
FOR Row ← 1 TO 3
  FOR Col ← 1 TO 3
    Table[Row, Col] ← Row * Col
  NEXT Col
NEXT Row

// Output the 2D array
OUTPUT "3x3 Multiplication Table:"
FOR Row ← 1 TO 3
  FOR Col ← 1 TO 3
    OUTPUT Row, " x ", Col, " = ", Table[Row, Col]
  NEXT Col
NEXT Row`,

  bubblesort: `// Bubble Sort Algorithm
DECLARE List : ARRAY[1:6] OF INTEGER
DECLARE Temp : INTEGER

// Initialise unsorted array
List[1] ← 64
List[2] ← 34
List[3] ← 25
List[4] ← 12
List[5] ← 22
List[6] ← 11

OUTPUT "Before sorting:"
FOR i ← 1 TO 6
  OUTPUT List[i]
NEXT i

// Bubble sort (nested loops)
FOR i ← 1 TO 5
  FOR j ← 1 TO 6 - i
    IF List[j] > List[j + 1] THEN
      // Swap
      Temp ← List[j]
      List[j] ← List[j + 1]
      List[j + 1] ← Temp
    ENDIF
  NEXT j
NEXT i

OUTPUT "After sorting (ascending):"
FOR i ← 1 TO 6
  OUTPUT List[i]
NEXT i`,

  linearsearch: `// Linear Search Algorithm
DECLARE Names : ARRAY[1:5] OF STRING
DECLARE Target : STRING
DECLARE Found : BOOLEAN
DECLARE Position : INTEGER

// Setup data
Names[1] ← "Ahmed"
Names[2] ← "Sara"
Names[3] ← "Ali"
Names[4] ← "Fatima"
Names[5] ← "Omar"

Target ← "Ali"
Found ← FALSE
Position ← 0

// Linear search
FOR i ← 1 TO 5
  IF Names[i] = Target THEN
    Found ← TRUE
    Position ← i
  ENDIF
NEXT i

// Report result
IF Found = TRUE THEN
  OUTPUT Target, " found at position ", Position
  ELSE
  OUTPUT Target, " was not found in the list"
ENDIF`,

  strings: `// String Operations
DECLARE Word : STRING
DECLARE Initial : STRING
Word ← "Hello World"

// Built-in string functions
OUTPUT "Original: ", Word
OUTPUT "Length: ", LENGTH(Word)
OUTPUT "Uppercase: ", UCASE(Word)
OUTPUT "Lowercase: ", LCASE(Word)
OUTPUT "First 5 chars: ", SUBSTRING(Word, 1, 5)
OUTPUT "Last 5 chars: ", SUBSTRING(Word, 7, 5)

// String comparison
DECLARE Pass : STRING
Pass ← "Secret123"

IF Pass = "Secret123" THEN
  OUTPUT "Password correct!"
  ELSE
  OUTPUT "Wrong password."
ENDIF

// Using LENGTH in a loop
DECLARE Msg : STRING
Msg ← "IGCSE"
OUTPUT "Characters in IGCSE:"
FOR k ← 1 TO LENGTH(Msg)
  OUTPUT SUBSTRING(Msg, k, 1)
NEXT k`,

  functions: `// Functions — return values to the caller
FUNCTION Square(N : INTEGER) RETURNS INTEGER
  RETURN N * N
ENDFUNCTION

FUNCTION Cube(N : INTEGER) RETURNS INTEGER
  RETURN N * N * N
ENDFUNCTION

FUNCTION Max(A : INTEGER, B : INTEGER) RETURNS INTEGER
  IF A > B THEN
    RETURN A
    ELSE
    RETURN B
  ENDIF
ENDFUNCTION

FUNCTION CircleArea(R : REAL) RETURNS REAL
  CONSTANT Pi ← 3.14159
  RETURN Pi * R * R
ENDFUNCTION

// Call the functions
OUTPUT "Square of 5: ", Square(5)
OUTPUT "Cube of 3: ", Cube(3)
OUTPUT "Max of 8,13: ", Max(8, 13)
OUTPUT "Circle area r=4: ", CircleArea(4.0)`,

  procedures: `// Procedures — execute a block of code
PROCEDURE PrintLine(Size : INTEGER)
  DECLARE i : INTEGER
  FOR i ← 1 TO Size
    OUTPUT "-"
  NEXT i
ENDPROCEDURE

PROCEDURE PrintHeader(Title : STRING)
  OUTPUT "=== ", Title, " ==="
ENDPROCEDURE

PROCEDURE Greet(Name : STRING, Times : INTEGER)
  DECLARE j : INTEGER
  FOR j ← 1 TO Times
    OUTPUT "Hello, ", Name, "!"
  NEXT j
ENDPROCEDURE

// Call the procedures
CALL PrintHeader("Student Report")
CALL PrintLine(20)
CALL Greet("Ahmed", 3)
CALL PrintLine(20)`,

  filehandling: `// File Handling (Simulated)
// NOTE: In this IDE, files are simulated in-memory.
// In real exams, this is the required syntax.

DECLARE StudentName : STRING
DECLARE StudentScore : INTEGER

// WRITE to a file
OPENFILE "students.txt" FOR WRITE
StudentName ← "Ahmed Ali"
StudentScore ← 95
WRITEFILE "students.txt", StudentName
WRITEFILE "students.txt", StudentScore
CLOSEFILE "students.txt"

OUTPUT "Data written to students.txt"

// READ from the same file
OPENFILE "students.txt" FOR READ
READFILE "students.txt", StudentName
READFILE "students.txt", StudentScore
CLOSEFILE "students.txt"

OUTPUT "Read back: ", StudentName, " scored ", StudentScore`,

  totalling: `// Totalling, Counting, Max, Min, Average
DECLARE Values : ARRAY[1:8] OF INTEGER
Values[1] ← 45
Values[2] ← 82
Values[3] ← 31
Values[4] ← 97
Values[5] ← 56
Values[6] ← 14
Values[7] ← 73
Values[8] ← 60

DECLARE Total   : INTEGER
DECLARE Count   : INTEGER
DECLARE Maximum : INTEGER
DECLARE Minimum : INTEGER
DECLARE Average : REAL

// Initialise
Total   ← 0
Count   ← 0
Maximum ← Values[1]
Minimum ← Values[1]

// Single pass for all stats
FOR i ← 1 TO 8
  Total ← Total + Values[i]
  Count ← Count + 1
  IF Values[i] > Maximum THEN
    Maximum ← Values[i]
  ENDIF
  IF Values[i] < Minimum THEN
    Minimum ← Values[i]
  ENDIF
NEXT i

Average ← Total / Count

OUTPUT "Count  : ", Count
OUTPUT "Total  : ", Total
OUTPUT "Average: ", Average
OUTPUT "Maximum: ", Maximum
OUTPUT "Minimum: ", Minimum`
};

document.querySelectorAll('.chip').forEach(chip => {
  chip.addEventListener('click', () => {
    const ex = EXAMPLES[chip.dataset.ex];
    if (ex) {
      editor.value = ex;
      updateLineNumbers();
      liveCheck();
      editor.focus();
    }
  });
});

// ===================================================================
// VIRTUAL FILE SYSTEM (for file handling simulation)
// ===================================================================
const VFS = {};

// ===================================================================
// VARIABLE TRACER
// ===================================================================
let traceVars = {};

function updateTrace() {
  if (Object.keys(traceVars).length === 0) {
    traceBody.innerHTML = '<div class="no-errors">No variables tracked yet</div>';
    return;
  }
  let html = `<table class="trace-table">
    <thead><tr><th>Variable</th><th>Value</th><th>Type</th></tr></thead><tbody>`;
  for (const [k, v] of Object.entries(traceVars)) {
    const type = typeof v === 'number' ? 'NUMBER' : typeof v === 'boolean' ? 'BOOLEAN' : 'STRING';
    const cls = type === 'NUMBER' ? 'trace-val-num' : type === 'BOOLEAN' ? 'trace-val-bool' : 'trace-val-str';
    html += `<tr><td>${escHtml(k)}</td><td class="${cls}">${escHtml(String(v))}</td><td>${type}</td></tr>`;
  }
  html += '</tbody></table>';
  traceBody.innerHTML = html;
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ===================================================================
// CONSOLE HELPERS
// ===================================================================
function printLine(text, cls = 'console-line') {
  const div = document.createElement('div');
  div.className = cls;
  div.textContent = String(text);
  consoleOutput.appendChild(div);
  consoleOutput.scrollTop = consoleOutput.scrollHeight;
}

function printError(msg) {
  printLine(msg, 'console-error');
}

function printSep() {
  const div = document.createElement('div');
  div.className = 'console-sep';
  consoleOutput.appendChild(div);
}

// ===================================================================
// CORE COMPILER / TRANSPILER
// ===================================================================
document.getElementById('btn-run').addEventListener('click', runCode);

function runCode() {
  // Clear output
  consoleOutput.innerHTML = '';
  traceVars = {};
  VFS_reset();

  // Switch to console tab
  document.querySelectorAll('.out-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.out-content').forEach(c => c.classList.remove('active'));
  document.querySelector('[data-tab="console"]').classList.add('active');
  document.getElementById('tab-console').classList.add('active');

  printLine(`▶ Running...`, 'console-warn');
  printSep();

  const rawCode = editor.value;
  if (!rawCode.trim()) { printLine('No code to run.', 'console-warn'); return; }

  try {
    const jsCode = transpile(rawCode);
    executeJS(jsCode);
  } catch (e) {
    printError(`RUNTIME ERROR: ${e.message}`);
    console.error(e);
  }

  printSep();
  printLine('✔ Execution complete', 'console-warn');
  updateTrace();
}

// ===================================================================
// TRANSPILER: Pseudocode → JavaScript
// ===================================================================
function transpile(code) {
  // Pre-process: CASE OF (multi-line block) → if/else chain
  code = processCaseOf(code);

  const lines = code.split('\n');
  const out   = [];

  // Preamble: built-in runtime functions
  out.push(`
"use strict";
const __output = (function(){
  const fn = (...args) => {
    const s = args.map(a => a === undefined ? 'undefined' : a === null ? '' : String(a)).join('');
    __print(s);
  };
  return fn;
})();

function __print(s) { window.__pseudoPrint(s); }
function __input(prompt) { return window.__pseudoInput(prompt); }

function LENGTH(s){ return String(s).length; }
function UCASE(s){ return String(s).toUpperCase(); }
function LCASE(s){ return String(s).toLowerCase(); }
function SUBSTRING(s, start, len){ return String(s).substr(start-1, len); }
function ROUND(n, places){ 
  if(places === undefined) return Math.round(n);
  const f = Math.pow(10, places);
  return Math.round(n * f) / f;
}
function RANDOM(){ return Math.random(); }
function MOD(a, b){ return a % b; }
function DIV(a, b){ return Math.trunc(a / b); }

// File handling (simulated)
const __vfs = {};
const __vfsPtr = {};
function __openfile(name, mode){
  name = String(name);
  if(mode === 'WRITE'){ __vfs[name] = []; __vfsPtr[name] = 0; }
  else if(mode === 'READ'){ __vfsPtr[name] = 0; }
}
function __closefile(name){ name = String(name); /* no-op */ }
function __writefile(name, val){ name=String(name); if(!__vfs[name]) __vfs[name]=[]; __vfs[name].push(val); }
function __readfile(name){ name=String(name); const p = __vfsPtr[name]||0; __vfsPtr[name]=p+1; return __vfs[name]?__vfs[name][p]:undefined; }
`);

  lines.forEach((rawLine, idx) => {
    const lineNum = idx + 1;
    let line = rawLine.replace(/\/\/.*/g, '').replace(/\r/g, '');
    const trimmed = line.trim();

    // Track variable names for trace (heuristic)
    out.push(transpileLine(line, trimmed, lineNum));
  });

  return out.join('\n');
}

function transpileLine(line, trimmed, lineNum) {
  // Skip empty / comment-only
  if (!trimmed) return '';

  const t = trimmed;
  const tUP = t.toUpperCase();

  // ── CONSTANT ──
  if (/^CONSTANT\s+/i.test(t)) {
    return t.replace(/^CONSTANT\s+(\w+)\s*(?:<-|←|=)\s*(.*)/i, (_, id, val) => {
      const v = convertValue(val.trim());
      return `const ${id} = ${v}; window.__trace && window.__trace("${id}", ${id});`;
    });
  }

  // ── DECLARE (1D array) ──
  if (/^DECLARE\s+\w+\s*:\s*ARRAY\s*\[/i.test(t)) {
    return t.replace(/^DECLARE\s+(\w+)\s*:\s*ARRAY\s*\[(\d+)\s*:\s*(\d+)\s*,\s*(\d+)\s*:\s*(\d+)\s*\]\s+OF\s+\w+/i,
      (_, id, r1, r2, c1, c2) => {
        const rows = parseInt(r2) - parseInt(r1) + 1;
        const cols = parseInt(c2) - parseInt(c1) + 1;
        const offset_r = parseInt(r1);
        const offset_c = parseInt(c1);
        return `var ${id} = Array.from({length:${rows+2}}, ()=>new Array(${cols+2}).fill(0)); var __off_${id}_r = ${offset_r}; var __off_${id}_c = ${offset_c};`;
      }).replace(/^DECLARE\s+(\w+)\s*:\s*ARRAY\s*\[(\d+)\s*:\s*(\d+)\s*\]\s+OF\s+\w+/i,
      (_, id, lo, hi) => {
        const sz = parseInt(hi) - parseInt(lo) + 1;
        const off = parseInt(lo);
        return `var ${id} = new Array(${sz + 2}).fill(0); var __off_${id} = ${off};`;
      });
  }

  // ── DECLARE (simple) ──
  if (/^DECLARE\s+/i.test(t)) {
    return t.replace(/^DECLARE\s+(\w+)\s*:\s*\w+/i, (_, id) => `var ${id} = undefined;`);
  }

  // ── FUNCTION definition ──
  if (/^FUNCTION\s+/i.test(t)) {
    return t.replace(/^FUNCTION\s+(\w+)\s*\((.*?)\)\s+RETURNS\s+\w+/i, (_, name, params) => {
      const p = cleanParams(params);
      return `function ${name}(${p}) {`;
    });
  }

  // ── ENDFUNCTION ──
  if (/^ENDFUNCTION$/i.test(t)) return '}';

  // ── PROCEDURE definition ──
  if (/^PROCEDURE\s+(\w+)\s*\(/i.test(t)) {
    return t.replace(/^PROCEDURE\s+(\w+)\s*\((.*?)\)/i, (_, name, params) => {
      const p = cleanParams(params);
      return `function ${name}(${p}) {`;
    });
  }
  if (/^PROCEDURE\s+(\w+)$/i.test(t)) {
    return t.replace(/^PROCEDURE\s+(\w+)$/i, (_, name) => `function ${name}() {`);
  }

  // ── ENDPROCEDURE ──
  if (/^ENDPROCEDURE$/i.test(t)) return '}';

  // ── RETURN ──
  if (/^RETURN\b/i.test(t)) {
    const expr = t.replace(/^RETURN\s*/i, '').trim();
    return `return ${convertExpression(expr)};`;
  }

  // ── CALL ──
  if (/^CALL\s+/i.test(t)) {
    return t.replace(/^CALL\s+(\w+)\s*\((.*?)\)/i, (_, name, args) => {
      return `${name}(${convertArgs(args)});`;
    }).replace(/^CALL\s+(\w+)$/i, (_, name) => `${name}();`);
  }

  // ── INPUT ──
  if (/^INPUT\s+/i.test(t)) {
    const id = t.replace(/^INPUT\s+/i, '').trim();
    const safeId = convertArrayIndex(id);
    return `${safeId} = __inputAuto(__input("${id}: ")); window.__trace && window.__trace("${id}", ${safeId});`;
  }

  // ── OUTPUT ──
  if (/^OUTPUT\b/i.test(t)) {
    const rest = t.replace(/^OUTPUT\s*/i, '').trim();
    if (!rest) return `__output("");`;
    const parts = splitOutputArgs(rest);
    const args = parts.map(p => convertExpression(p.trim())).join(', ');
    return `__output(${args});`;
  }

  // ── FOR (with STEP) ──
  if (/^FOR\s+\w+\s*(?:<-|←|=)\s*.+\s+TO\s+.+\s+STEP\s+/i.test(t)) {
    return t.replace(/^FOR\s+(\w+)\s*(?:<-|←|=)\s*(.*?)\s+TO\s+(.*?)\s+STEP\s+(.*)/i,
      (_, id, from, to, step) => {
        const f = convertExpression(from.trim());
        const toE = convertExpression(to.trim());
        const stE = convertExpression(step.trim());
        return `for(let ${id} = ${f}; (${stE}) > 0 ? ${id} <= ${toE} : ${id} >= ${toE}; ${id} += (${stE})) {`;
      });
  }

  // ── FOR (plain) ──
  if (/^FOR\s+\w+\s*(?:<-|←|=)\s*.+\s+TO\s+/i.test(t)) {
    return t.replace(/^FOR\s+(\w+)\s*(?:<-|←|=)\s*(.*?)\s+TO\s+(.*)/i,
      (_, id, from, to) => {
        const f = convertExpression(from.trim());
        const toE = convertExpression(to.trim());
        return `for(let ${id} = ${f}; ${id} <= ${toE}; ${id}++) {`;
      });
  }

  // ── NEXT ──
  if (/^NEXT\b/i.test(t)) return '}';

  // ── WHILE ──
  if (/^WHILE\s+.*\s+DO$/i.test(t)) {
    return t.replace(/^WHILE\s+(.*)\s+DO$/i, (_, cond) => {
      return `while(${convertCondition(cond)}) {`;
    });
  }

  // ── ENDWHILE ──
  if (/^ENDWHILE$/i.test(t)) return '}';

  // ── REPEAT ──
  if (/^REPEAT$/i.test(t)) return 'do {';

  // ── UNTIL ──
  if (/^UNTIL\s+/i.test(t)) {
    return t.replace(/^UNTIL\s+(.*)/i, (_, cond) => {
      return `} while(!(${convertCondition(cond)}));`;
    });
  }

  // ── IF ... THEN ──
  if (/^IF\s+.*\s+THEN$/i.test(t)) {
    return t.replace(/^IF\s+(.*)\s+THEN$/i, (_, cond) => {
      return `if(${convertCondition(cond)}) {`;
    });
  }

  // ── ELSEIF ... THEN ──
  if (/^ELSEIF\s+.*\s+THEN$/i.test(t)) {
    return t.replace(/^ELSEIF\s+(.*)\s+THEN$/i, (_, cond) => {
      return `} else if(${convertCondition(cond)}) {`;
    });
  }

  // ── ELSE ──
  if (/^ELSE$/i.test(t)) return '} else {';

  // ── ENDIF ──
  if (/^ENDIF$/i.test(t)) return '}';

  // ── File Handling ──
  if (/^OPENFILE\s+/i.test(t)) {
    return t.replace(/^OPENFILE\s+(.*?)\s+FOR\s+(READ|WRITE)/i, (_, file, mode) => {
      return `__openfile(${convertExpression(file.trim())}, "${mode.toUpperCase()}");`;
    });
  }
  if (/^CLOSEFILE\s+/i.test(t)) {
    return t.replace(/^CLOSEFILE\s+(.*)/i, (_, file) => {
      return `__closefile(${convertExpression(file.trim())});`;
    });
  }
  if (/^WRITEFILE\s+/i.test(t)) {
    return t.replace(/^WRITEFILE\s+(.*?),\s*(.*)/i, (_, file, val) => {
      return `__writefile(${convertExpression(file.trim())}, ${convertExpression(val.trim())});`;
    });
  }
  if (/^READFILE\s+/i.test(t)) {
    return t.replace(/^READFILE\s+(.*?),\s*(.*)/i, (_, file, id) => {
      return `${id.trim()} = __readfile(${convertExpression(file.trim())}); window.__trace && window.__trace("${id.trim()}", ${id.trim()});`;
    });
  }

  // ── ASSIGNMENT (2D array) ──
  if (/\w+\s*\[\s*[^\]]+\s*,\s*[^\]]+\s*\]\s*(?:<-|←)/.test(t)) {
    return t.replace(/(\w+)\s*\[\s*([^\]]+)\s*,\s*([^\]]+)\s*\]\s*(?:<-|←)\s*(.*)/,
      (_, id, r, c, val) => {
        return `${id}[${convertExpression(r.trim())}][${convertExpression(c.trim())}] = ${convertExpression(val.trim())};`;
      });
  }

  // ── ASSIGNMENT (1D array) ──
  if (/\w+\s*\[\s*[^\]]+\s*\]\s*(?:<-|←)/.test(t)) {
    return t.replace(/(\w+)\s*\[\s*([^\]]+)\s*\]\s*(?:<-|←)\s*(.*)/,
      (_, id, idx, val) => {
        return `${id}[${convertExpression(idx.trim())}] = ${convertExpression(val.trim())}; window.__trace && window.__trace("${id}[${idx.trim()}]", ${id}[${convertExpression(idx.trim())}]);`;
      });
  }

  // ── ASSIGNMENT (simple) ──
  if (/^[A-Za-z]\w*\s*(?:<-|←)/.test(t)) {
    return t.replace(/^([A-Za-z]\w*)\s*(?:<-|←)\s*(.*)/, (_, id, val) => {
      return `${id} = ${convertExpression(val.trim())}; window.__trace && window.__trace("${id}", ${id});`;
    });
  }

  // Fallback: skip unknown lines (may be comments already stripped)
  return `// ${t}`;
}

// ─── CASE OF → if/else chain ────────────────────────────────────────
function processCaseOf(code) {
  const lines = code.split('\n');
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.replace(/\/\/.*/g, '').trim();
    const m = trimmed.match(/^CASE\s+OF\s+(\w+)/i);
    if (m) {
      const varName = m[1];
      const indent = line.match(/^(\s*)/)[1];
      i++;
      const branches = [];
      let otherwiseStmt = null;

      while (i < lines.length) {
        const bl = lines[i].replace(/\/\/.*/g, '').trim();
        if (/^ENDCASE$/i.test(bl)) { i++; break; }
        const otherwiseM = bl.match(/^OTHERWISE\s+(.*)/i);
        if (otherwiseM) { otherwiseStmt = otherwiseM[1]; i++; continue; }
        const branchM = bl.match(/^'([^']+)'\s*:\s*(.*)/);
        const branchMNum = bl.match(/^(\d+(?:\.\d+)?)\s*:\s*(.*)/);
        const branchMStr = bl.match(/^"([^"]+)"\s*:\s*(.*)/);
        if (branchM) { branches.push({ val: `'${branchM[1]}'`, stmt: branchM[2] }); }
        else if (branchMNum) { branches.push({ val: branchMNum[1], stmt: branchMNum[2] }); }
        else if (branchMStr) { branches.push({ val: `"${branchMStr[1]}"`, stmt: branchMStr[2] }); }
        i++;
      }

      branches.forEach((b, bi) => {
        const kw = bi === 0 ? 'IF' : 'ELSEIF';
        out.push(`${indent}${kw} ${varName} = ${b.val} THEN`);
        out.push(`${indent}  ${b.stmt}`);
      });
      if (otherwiseStmt) {
        out.push(`${indent}  ELSE`);
        out.push(`${indent}  ${otherwiseStmt}`);
      }
      if (branches.length > 0) out.push(`${indent}ENDIF`);
    } else {
      out.push(line);
      i++;
    }
  }
  return out.join('\n');
}

// ─── EXPRESSION CONVERSION ─────────────────────────────────────────
function convertExpression(expr) {
  if (!expr) return '""';
  return expr
    // 2D array access
    .replace(/(\w+)\[([^\],]+),([^\]]+)\]/g, (_, id, r, c) => `${id}[${convertExpression(r.trim())}][${convertExpression(c.trim())}]`)
    // Boolean literals
    .replace(/\bTRUE\b/g, 'true')
    .replace(/\bFALSE\b/g, 'false')
    // String literals — protect
    // Power
    .replace(/\^/g, '**')
    // Not equal
    .replace(/<>/g, '!==')
    // Comparison ops (safe, avoid double-replace)
    .replace(/([^<>!])=(?!=)/g, '$1===')
    .replace(/!===/g, '!==')  // fix triple
    // Boolean ops
    .replace(/\bAND\b/g, '&&')
    .replace(/\bOR\b/g,  '||')
    .replace(/\bNOT\b/g, '!')
    // MOD/DIV as function calls (syntax: MOD(a,b) DIV(a,b)) already JS functions
    // String concatenation: & → + in pseudocode (non-standard but sometimes used)
    .replace(/(?<![=!<>])&(?!=)/g, '+');
}

function convertCondition(cond) {
  return convertExpression(cond);
}

function convertValue(val) {
  return convertExpression(val);
}

function convertArgs(args) {
  if (!args || !args.trim()) return '';
  return args.split(',').map(a => convertExpression(a.trim())).join(', ');
}

function splitOutputArgs(str) {
  // Split on commas not inside quotes
  const parts = [];
  let depth = 0, cur = '', inStr = false, strCh = '';
  for (const ch of str) {
    if (!inStr && (ch === '"' || ch === "'")) { inStr = true; strCh = ch; cur += ch; }
    else if (inStr && ch === strCh) { inStr = false; cur += ch; }
    else if (!inStr && ch === '(') { depth++; cur += ch; }
    else if (!inStr && ch === ')') { depth--; cur += ch; }
    else if (!inStr && ch === ',' && depth === 0) { parts.push(cur); cur = ''; }
    else { cur += ch; }
  }
  if (cur) parts.push(cur);
  return parts;
}

function cleanParams(params) {
  if (!params || !params.trim()) return '';
  return params.split(',').map(p => {
    const m = p.trim().match(/^(\w+)\s*:/);
    return m ? m[1] : p.trim();
  }).join(', ');
}

function convertArrayIndex(id) {
  // Handle array[x] access in INPUT
  if (/\[/.test(id)) {
    return id.replace(/(\w+)\[([^\]]+)\]/g, (_, name, idx) => `${name}[${convertExpression(idx)}]`);
  }
  return id;
}

// ─── SAFE INPUT ─────────────────────────────────────────────────────
function VFS_reset() { Object.keys(VFS).forEach(k => delete VFS[k]); }

// ===================================================================
// RUNTIME EXECUTION
// ===================================================================
function executeJS(jsCode) {
  // Wire up IO
  window.__pseudoPrint = (s) => printLine(s, 'console-line');
  window.__trace = (name, val) => { traceVars[name] = val; };

  // Input handler via prompt
  window.__pseudoInput = (prompt) => {
    const val = window.prompt(prompt || 'Input:');
    if (val === null) return '';
    printLine(`← ${val}`, 'console-input-line');
    return val;
  };

  // Inject auto-type-detect input
  const preamble = `
function __inputAuto(v) {
  if(v === null || v === '') return v;
  if(!isNaN(v) && v.trim() !== '') {
    const n = Number(v);
    return Number.isInteger(n) ? n : n;
  }
  if(v === 'TRUE') return true;
  if(v === 'FALSE') return false;
  return v;
}
`;

  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function(preamble + jsCode);
    fn();
  } catch (e) {
    const friendly = friendlyError(e.message);
    printError(friendly.msg);
    if (friendly.hint) printLine('💡 ' + friendly.hint, 'console-warn');
    throw e;
  }
}

// ===================================================================
// FRIENDLY ERROR MESSAGES
// ===================================================================
function friendlyError(msg) {
  if (/is not defined/.test(msg)) {
    const name = msg.match(/(\w+) is not defined/)?.[1] || '';
    return {
      msg: `Variable '${name}' is not defined`,
      hint: `Make sure you declared it first: DECLARE ${name} : INTEGER`
    };
  }
  if (/Cannot read prop/.test(msg) || /null/.test(msg)) {
    return { msg: 'Tried to use an undefined variable or array element', hint: 'Check array bounds and variable declarations' };
  }
  if (/is not a function/.test(msg)) {
    const name = msg.match(/(\w+) is not a function/)?.[1] || '';
    return { msg: `'${name}' is not a function`, hint: 'Check function name spelling and that it is defined before use' };
  }
  if (/Maximum call stack/.test(msg)) {
    return { msg: 'Stack overflow — infinite recursion detected', hint: 'Make sure your function/procedure has a valid exit condition' };
  }
  if (/Unexpected token/.test(msg)) {
    return { msg: `Syntax error: ${msg}`, hint: 'Check for missing THEN, DO, or mismatched ENDIF/ENDWHILE/NEXT' };
  }
  return { msg: msg, hint: '' };
}

// ===================================================================
// TEST QUESTIONS DATA
// ===================================================================
const TEST_QUESTIONS = [
  {
    tag: 'Variables',
    title: 'Temperature Converter',
    desc: 'Declare a REAL variable Celsius. Ask user to input a temperature. Convert it to Fahrenheit using: F = C × 9/5 + 32. Output the result.',
    starter: `// Temperature Converter
DECLARE Celsius : REAL
DECLARE Fahrenheit : REAL

// Your code here:
INPUT Celsius
Fahrenheit ← Celsius * 9 / 5 + 32
OUTPUT "Fahrenheit: ", Fahrenheit`
  },
  {
    tag: 'IF / ELSE',
    title: 'Grade Calculator',
    desc: 'Ask the user for a score (0–100). Use IF/ELSEIF/ELSE to output the grade: A (90+), B (80+), C (70+), D (60+), F (below 60).',
    starter: `// Grade Calculator
DECLARE Score : INTEGER

INPUT Score

// Add your grade logic here:
IF Score >= 90 THEN
  OUTPUT "Grade: A"
  ELSEIF Score >= 80 THEN
    OUTPUT "Grade: B"
  ELSEIF Score >= 70 THEN
    OUTPUT "Grade: C"
  ELSEIF Score >= 60 THEN
    OUTPUT "Grade: D"
  ELSE
    OUTPUT "Grade: F"
ENDIF`
  },
  {
    tag: 'Loops',
    title: 'Multiplication Table',
    desc: 'Ask user to input a number N. Use a FOR loop to print the full multiplication table from N×1 to N×12.',
    starter: `// Multiplication Table
DECLARE N : INTEGER

INPUT N

FOR i ← 1 TO 12
  OUTPUT N, " x ", i, " = ", N * i
NEXT i`
  },
  {
    tag: 'Loops',
    title: 'Sum of Digits',
    desc: 'Ask user to input a positive integer. Use a WHILE loop to sum all digits. Output the digit sum.',
    starter: `// Sum of Digits
DECLARE Num : INTEGER
DECLARE Sum : INTEGER
Sum ← 0

INPUT Num

WHILE Num > 0 DO
  Sum ← Sum + MOD(Num, 10)
  Num ← DIV(Num, 10)
ENDWHILE

OUTPUT "Sum of digits: ", Sum`
  },
  {
    tag: 'Arrays',
    title: 'Find Min and Max',
    desc: 'Declare an integer array of 6 elements. Ask the user to input all 6 values. Find and output the minimum and maximum values.',
    starter: `// Find Min and Max
DECLARE Data : ARRAY[1:6] OF INTEGER
DECLARE Min : INTEGER
DECLARE Max : INTEGER

FOR i ← 1 TO 6
  INPUT Data[i]
NEXT i

Min ← Data[1]
Max ← Data[1]

FOR i ← 2 TO 6
  IF Data[i] < Min THEN
    Min ← Data[i]
  ENDIF
  IF Data[i] > Max THEN
    Max ← Data[i]
  ENDIF
NEXT i

OUTPUT "Minimum: ", Min
OUTPUT "Maximum: ", Max`
  },
  {
    tag: 'Sorting',
    title: 'Bubble Sort (Descending)',
    desc: 'Create an array with 5 values. Sort them in DESCENDING order using bubble sort. Output the sorted array.',
    starter: `// Bubble Sort - Descending
DECLARE Arr : ARRAY[1:5] OF INTEGER
DECLARE Temp : INTEGER
Arr[1] ← 30
Arr[2] ← 10
Arr[3] ← 50
Arr[4] ← 20
Arr[5] ← 40

FOR i ← 1 TO 4
  FOR j ← 1 TO 5 - i
    IF Arr[j] < Arr[j+1] THEN
      Temp ← Arr[j]
      Arr[j] ← Arr[j+1]
      Arr[j+1] ← Temp
    ENDIF
  NEXT j
NEXT i

OUTPUT "Sorted (descending):"
FOR i ← 1 TO 5
  OUTPUT Arr[i]
NEXT i`
  },
  {
    tag: 'Search',
    title: 'Linear Search with Count',
    desc: 'Create an array of 8 integers. Ask user for a target. Count how many times the target appears in the array and output the count.',
    starter: `// Linear Search with Count
DECLARE List : ARRAY[1:8] OF INTEGER
DECLARE Target : INTEGER
DECLARE Count : INTEGER
Count ← 0

List[1] ← 5
List[2] ← 3
List[3] ← 5
List[4] ← 7
List[5] ← 5
List[6] ← 2
List[7] ← 9
List[8] ← 5

INPUT Target

FOR i ← 1 TO 8
  IF List[i] = Target THEN
    Count ← Count + 1
  ENDIF
NEXT i

OUTPUT Target, " appears ", Count, " time(s)"`
  },
  {
    tag: 'Functions',
    title: 'Factorial Function',
    desc: 'Write a FUNCTION Factorial that takes an integer N and returns N! (N factorial). Call it and output the result for N=5.',
    starter: `// Factorial Function
FUNCTION Factorial(N : INTEGER) RETURNS INTEGER
  DECLARE Result : INTEGER
  Result ← 1
  FOR i ← 1 TO N
    Result ← Result * i
  NEXT i
  RETURN Result
ENDFUNCTION

OUTPUT "5! = ", Factorial(5)
OUTPUT "6! = ", Factorial(6)`
  },
  {
    tag: 'Strings',
    title: 'Palindrome Checker',
    desc: 'Ask user for a word. Use SUBSTRING and LENGTH to check if it is a palindrome (reads same forwards and backwards). Output YES or NO.',
    starter: `// Palindrome Checker
DECLARE Word : STRING
DECLARE Reversed : STRING
DECLARE IsPalin : BOOLEAN
Reversed ← ""

INPUT Word
Word ← LCASE(Word)

FOR i ← LENGTH(Word) TO 1 STEP -1
  Reversed ← Reversed & SUBSTRING(Word, i, 1)
NEXT i

IF Word = Reversed THEN
  OUTPUT Word, " is a PALINDROME"
  ELSE
  OUTPUT Word, " is NOT a palindrome"
ENDIF`
  },
  {
    tag: 'File Handling',
    title: 'Write & Read File',
    desc: 'Write three student names to a file "class.txt". Then read them back and output them to screen.',
    starter: `// Write & Read File
DECLARE Name : STRING

OPENFILE "class.txt" FOR WRITE
WRITEFILE "class.txt", "Ahmed"
WRITEFILE "class.txt", "Sara"
WRITEFILE "class.txt", "Zainab"
CLOSEFILE "class.txt"

OUTPUT "Reading from file:"
OPENFILE "class.txt" FOR READ
READFILE "class.txt", Name
OUTPUT Name
READFILE "class.txt", Name
OUTPUT Name
READFILE "class.txt", Name
OUTPUT Name
CLOSEFILE "class.txt"`
  },
  {
    tag: 'Mixed',
    title: 'Number Guessing Game',
    desc: 'Use RANDOM to pick a number 1–10. Let the user guess using REPEAT UNTIL. Count their attempts and output how many tries it took.',
    starter: `// Number Guessing Game
DECLARE Secret : INTEGER
DECLARE Guess : INTEGER
DECLARE Tries : INTEGER
Tries ← 0
Secret ← ROUND(RANDOM() * 9 + 1, 0)

OUTPUT "Guess a number between 1 and 10!"

REPEAT
  INPUT Guess
  Tries ← Tries + 1
  IF Guess < Secret THEN
    OUTPUT "Too low!"
  ELSEIF Guess > Secret THEN
    OUTPUT "Too high!"
  ELSE
    OUTPUT "Correct! It was ", Secret
  ENDIF
UNTIL Guess = Secret

OUTPUT "You got it in ", Tries, " tries!"`
  },
  {
    tag: '2D Arrays',
    title: 'Matrix Addition',
    desc: 'Declare two 2×2 integer arrays A and B. Fill them with values. Add them element-by-element into array C. Output C.',
    starter: `// Matrix Addition (2x2)
DECLARE A : ARRAY[1:2, 1:2] OF INTEGER
DECLARE B : ARRAY[1:2, 1:2] OF INTEGER
DECLARE C : ARRAY[1:2, 1:2] OF INTEGER

A[1,1] ← 1
A[1,2] ← 2
A[2,1] ← 3
A[2,2] ← 4

B[1,1] ← 5
B[1,2] ← 6
B[2,1] ← 7
B[2,2] ← 8

FOR r ← 1 TO 2
  FOR c ← 1 TO 2
    C[r,c] ← A[r,c] + B[r,c]
  NEXT c
NEXT r

OUTPUT "Result matrix C:"
FOR r ← 1 TO 2
  FOR c ← 1 TO 2
    OUTPUT "C[", r, ",", c, "] = ", C[r,c]
  NEXT c
NEXT r`
  }
];

function buildTestCards() {
  const grid = document.getElementById('tests-grid');
  grid.innerHTML = '';
  TEST_QUESTIONS.forEach((q, i) => {
    const card = document.createElement('div');
    card.className = 'test-card';
    card.innerHTML = `
      <div class="test-card-tag">${q.tag}</div>
      <h4>${q.title}</h4>
      <p>${q.desc}</p>
      <button class="load-btn" data-idx="${i}">📋 Load Template</button>
    `;
    card.querySelector('.load-btn').addEventListener('click', () => {
      editor.value = q.starter;
      updateLineNumbers();
      liveCheck();
      document.getElementById('modal-tests').classList.remove('open');
      editor.focus();
    });
    grid.appendChild(card);
  });
}

// ===================================================================
// INIT
// ===================================================================
(function init() {
  // Load a starter example
  editor.value = EXAMPLES.hello;
  updateLineNumbers();
  liveCheck();
})();
