'strict mode'

import {exec} from 'node:child_process'
import os from 'os'
import * as mm from 'music-metadata'

async function getMusicDuration(filePath) {
  try {
    const metadata = await mm.parseFile(filePath);
    const duration = metadata.format.duration; 

    return duration
  } catch (error) {
    console.error(`Erro ao obter a duração do arquivo: ${error.message}`);
  }
}


async function play(file){
  let duracao=Math.floor(await getMusicDuration(file))

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


  export {clearDisplay,clog,createArr,play}