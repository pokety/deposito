'strict mode'

import {exec} from 'node:child_process'
import os from 'os'

async function play(file){
  let duracao=1

  switch (os.type()) {
    case 'win32':
      await spawn("./miniplay.exe", [`${file}`,duracao])      
      break;
    case 'Linux':
      await exec(`./miniplay ${file} ${duracao} `)
      
      break;
  
    default:
      break;
  }
}

function clearDisplay(){
  process.stdout.write('\x1Bc')
}

function clog(args){
  console.log(args)
}

const createArr=(arr)=>{
  var newArr = [];
  var newsObj = [];

  arr.forEach((el) => {
    if (!newArr.includes(el.modelo)) {

      newArr.push(el.modelo);
      
    }
  });

  
  newArr.forEach((ele) => {
    var Fpatrimonio = [];
    const mod = {};
    arr.forEach((el) => {
      if (el.modelo === ele) {
        Fpatrimonio.push(el.patrimonio);
        mod.grupo= el.grupo?el.grupo:'...'

      }
    });
  
    mod.modelo = ele;
    mod.patrimonio = `${Fpatrimonio.join(' - ')}`;
    mod.qty = `${Fpatrimonio.length}`
    newsObj.push(mod);
  });
  
  return newsObj;
};

async function notify(msg){
  fetch('http://10.1.1.8:81/deposito_acap', {
    method: 'POST', // PUT works too
    body: msg
  })
}

  export {clearDisplay,clog,createArr,play,notify}