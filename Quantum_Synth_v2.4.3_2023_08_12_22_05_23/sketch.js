let detector; //button
let observing = false;
let wait = 60/4; // 1/4 of a second wait time

let root = 65; //sets root note
let midiValues = [];
let pitch = []; //oscillators corresponding to each pitch
let winningIndex;
let volRate =[]; //random rates at which the volume will increase/decrease by
let pitchVol = []; //current recorded amp
let newRate = [];

let circles = [];
let colors = [241, 316, 60, 131]; //Blue, Pink, Yellow, Green
let effectTime; //for the pulse effect that happens on collapse

//for the start sequence
let timeBetweenNotes = 60/3; //I want the notes to play in 3th of a second each



function setup() {
  colorMode(HSB);
  //responsively scales canvas at a 16:9 ratio
  let w = windowWidth;
  let h = windowWidth*9/16;
  if(h > windowHeight) {
    h = windowHeight;
    w = windowHeight*16/9;
  }  
  createCanvas(w, h);
  //createCanvas(800, 450);
  //audio
  majorSeventh(root);
  constructChord();
  volRates();
  //visuals
  initializeCircArray();
  //user interaction
  detector = createButton('detector on/off');
  detector.mousePressed(toggleDetector); 
}

function draw() {
  background(0);
  noStroke();
  //start sequence
  if(frameCount < timeBetweenNotes*pitch.length+30){
  playChord();
    superposition();
   return;
  }
  //interactive part starts
  if (observing) {
    collapse(); 
  } else { 
    //if NOT observing
    superposition();
    changeVol();
  }
}

//chooses the loudest at the moment of button press to "collapse" into. When pressed again, everything goes back into superposition
function toggleDetector() {
  //if not observing already, now pressing button will make an observation:
  if (!observing && frameCount > wait) { //to avoid button smashing
    observing = true;
    wait = frameCount + 60/4; // 1/4 of a second delay
    let currentVol = 0;
    let loudest = 0;
    //finds the loudest oscillator (which corresponds to a frequency (MIDI note))
    //No notes can ever be the same freq at the same time this way, but that's fine for these purposes
    for (let i = 0; i < pitch.length; i++) {
      currentVol = pitchVol[i];
      if(currentVol > loudest) {
        loudest = currentVol;
        winningPitch = pitch[i];
      }
    }
    //the above grabs the oscillator, but we want its index
    winningIndex = pitch.indexOf(winningPitch);

    //all other pitches except for the winning one are silent now
    for (let i = 0; i < pitch.length; i++) {
      if (pitch[i] != winningPitch) {
        pitch[i].amp(0);
        //while theyre silent we can set the frequencies to change in relation to the winning pitch
        //every circle farther to the left of winning pitch will subtract 3 or 4 semitones more than the last:
        if(circles[i].x < circles[winningIndex].x) {
          midiValues[i] = (midiValues[winningIndex])-int(random(3,5)); //because 5 is not inclusive
        if(circles[i].x <= circles[winningIndex].x - width/2) {
            midiValues[i] = (midiValues[i])-int(random(3,5));
          }
        if(circles[i].x <= circles[winningIndex].x - width*3/4) {
            midiValues[i] = (midiValues[i])-int(random(3,5));
          // now every circle farther to the right of winning pitch will ADD 3 or 4 semitones more than the last:
          } else if (circles[i].x > circles[winningIndex].x) {
          midiValues[i] = (midiValues[winningIndex])+int(random(3,5));   
        if(circles[i].x >= circles[winningIndex].x + width/2) {
            midiValues[i] = (midiValues[i])+int(random(3,5));
          }
        if(circles[i].x >= circles[winningIndex].x + width*3/4) {
            midiValues[i] = (midiValues[i])+int(random(3,5));
          }
          }
        }
        //change the frequency according to this scheme
  pitch[i].freq(midiToFreq(midiValues[i]));
      } else {
        //winning pitch will be on
        pitch[i].amp(0.3);
      }
  }
    //pulse effect lasts 1/9 of a second
    effectTime = frameCount + 60/9;
    
   //if observing and button pressed now you'll STOP observing and all amps will be randomly set 
  } else if (observing && frameCount > wait) { //to avoid button smashing
    wait = frameCount + 60/4;
    observing = false;
    pitch[winningIndex].amp(0); //just resetting this one just in case
        for (let i = 0; i < pitch.length; i++) {
      pitch[i].amp(random(0,0.25)); //all oscillators will be reset randomly so that its different each time
    }
    volRates();//assigning new random rates
    circles[winningIndex].pulse = 0; //resetting pulse effect also to avoid button smashing and the circle's size will be affected
    winningPitch = -1; //just so that the winning pitch variable doesn't correspond to any actual existing pitch
  }
}

//uses the formula for a maj7 chord
function majorSeventh(root) {
  midiValues = [root, root + 4, 
    root + 7, root + 11];
}

//creates oscillators for all the notes in the chord
function playChord () {
    for (let i = 0; i < pitch.length; i++) {
      pitchVol[i] = 0.0;
      //intro sequence
    if (frameCount > timeBetweenNotes*i) {
      pitchVol[i] = 0.15;
      pitch[i].amp(pitchVol[i]);
  }
    }
}

 function constructChord() {
  for (let i = 0; i < midiValues.length; i++) {
    pitch[i] = new p5.Oscillator();
    pitch[i].setType('triangle');
    pitch[i].freq(midiToFreq(midiValues[i]));
    pitch[i].amp(0.0);
    pitch[i].start();
  }
 }

function volRates () {
  for (let i = 0; i < pitch.length; i++) {
    volRate[i] = random(0.003,0.005);
    newRate[i] = volRate[i]; //newRate handles sign switches (+,-)
  }
}

function changeVol () {
  for (let i = 0; i < pitch.length; i++) {
  pitchVol[i] = pitch[i].getAmp();
    //if it gets to loud, it fades out
      if(pitchVol[i] >= 0.2) {
        newRate[i] = -volRate[i];
    //if it gets too quite, it fades in
      } else if(pitchVol[i] <= 0) {
        newRate[i] = volRate[i];
      }
    //add the rate to the current volume
    pitch[i].amp(pitchVol[i] + newRate[i]);
  }
}

function initializeCircArray () {
  let x;
  for (let i = 0; i < pitch.length; i++) {
    //centering circles on equal spacing
    x = width/pitch.length*(i+1) - width/pitch.length/2; 
    circles.push(new Circle(x, colors[i]));
  }
}

function resetPositions () {
  for (let i = 0; i < pitch.length; i++) {
    circles[i].x = width/pitch.length*(i+1) - width/pitch.length/2; 
  }
}

function collapse() {
  push();
  textSize(width/27);
  fill(255);
  text("ON",width/32, height - height/18);
  pop();
  circles[winningIndex].winningEffect();
  for (let i = 0; i < pitch.length; i++) {
    fill(circles[winningIndex].u, 100, 100)
    if(circles[i].x < circles[winningIndex].x){
       circles[i].x += (width/8);
    } else if (circles[i].x > circles[winningIndex].x) {
       circles[i].x -= (width/8);
    }
   circles[i].display();
  }
}

function superposition() {
  resetPositions(); //reset back to initial 4 positions
  push();
  textSize(width/27);
  fill(50);
  text("OFF", width/32, height - height/18);
  pop();
  push();
  //mapping the brightness of the circles to the amplitude of the corrssponding oscillators
  let brightness;
  for (let i = 0; i < pitch.length; i++) {
    //panning audio from the circles positions rather than the canvas so that the effect will be stronger
    let panning = map(circles[i].x, circles[0].x+20, circles[circles.length-1].x,-1.0, 1.0);
    pitch[i].pan(panning);
    //0-0.15 amplitude will map to 0-100 brightness
    brightness = map(pitchVol[i], 0, 0.15, 0, 100);
    fill(circles[i].u, 100, brightness);
    circles[i].display();
  }
  pop();
}

class Circle {
  constructor(x, u) {
    this.x = x;
    this.y = height/2;
    this.diam = width/10.66;
    this.pulse = 0; //winning pitch effect
    this.u = u;
  }
  display() {
    //the pulse effect is really just an amount added to the diameter to make it appear bigger and smaller
    this.y = height/2;
    this.diam = width/10.66;
    circle(this.x, this.y, this.diam+this.pulse);
  }
  winningEffect() {
    if (frameCount < effectTime) {
      this.pulse += 6; //makes circle bigger
    } else if(frameCount < effectTime*2 && this.pulse > 0) {
      this.pulse -= 6;//makes circle smaller
    }
  }
}

function windowResized() {
  responsiveResize();
}

function responsiveResize() {
  let w = windowWidth;
  let h = windowWidth*9/16;
  if(h > windowHeight) {
    h = windowHeight;
    w = windowHeight*16/9;
  }  
  resizeCanvas(w, h);
}