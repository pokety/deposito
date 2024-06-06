'strict mode'

import {exec} from 'node:child_process'
import os from 'os'

async function play(file){
  switch (os.type()) {
    case 'win32':
        await exec(`sox.exe ${file} -d`)
      break;
    case 'Linux':

      await exec(`play ${file}`)
      
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
      }
    });

    mod.modelo = ele;
    mod.patrimonio = `${Fpatrimonio.join(' - ')}`;
    mod.qty = `${Fpatrimonio.length}`
    newsObj.push(mod);
  });
  return newsObj;
};


  export {clearDisplay,clog,createArr,play}