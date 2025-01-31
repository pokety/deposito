'use strict'

import {MongoClient, ServerApiVersion} from "mongodb";
import inquirer from "inquirer";
import dotenv from 'dotenv'
import store from'store'
import { exit } from 'node:process'
import moment from 'moment'
import colors from 'colors'
import PDFDocument from "pdfkit-table"
import fs from 'fs-extra'
import open from 'open'
import os from "os"
import {clearDisplay,clog,createArr,play} from './modules.js'
import Monitor from "./monitor.js";
let monitor=new Monitor()
store.set("qtyModel",'uva')
dotenv.config()

const listarGrupos=["IMAGEM","AUDIO","ENERGIA","COMUNICACAO","FERRAMENTAS"]
const listaUsuarios=["claudio",'eyler',"dourado"]

var client
client=new MongoClient(`mongodb://${process.env.M_USER}:${process.env.M_PASSWORD}@${process.env.URI}:27017`)

const db=client.db(process.env.DB)
const collection=db.collection(process.env.COLLECTION)
// console.log(await collection.find().toArray())

collection.createIndex( { "patrimonio": 1 }, { unique: true } )

const prompt=inquirer.createPromptModule()
const osBar=async()=>{
    let tudo=await collection.find().toArray()
    var os=[]
    tudo.forEach((el)=>{
        if(!os.includes(el.evento)){
            os.push(el.evento)
        }
    })
    var os1 = os.filter((items)=>{return items != "deposito"})
    return os1.sort()
}
const allType=async(group)=>{
    if(group){
        let tudo=await collection.find({$or:[{grupo:group},{grupo:null}]}).toArray()
        var modelo=[]
        
        tudo.forEach((el)=>{
            if(!modelo.includes(el.modelo)){
                modelo.push(el.modelo)
            }
        })
    
        return modelo.sort()
    }else{
        let tudo=await collection.find().toArray()
        var modelo=[]
        
        tudo.forEach((el)=>{
            if(!modelo.includes(el.modelo)){
                modelo.push(el.modelo)
            }
        })
    
        return modelo.sort()  
    }
}

function checkAvailability(arr, val) {
    return arr.some((arrVal) => arrVal.patrimonio=== val.patrimonio);
}

const allGrupos=async()=>{
    let tudo=await collection.find().toArray()
    var grupos=[]
    tudo.forEach((el)=>{
        if(!grupos.includes(el.grupo)){
            grupos.push(el.grupo)
        }
    })
    return grupos.sort()
}

const menu=async()=>{
    if(store.get('user')){
        
    }else{
        let user=await prompt([
            {
                type:'list',
                name:"user",
                choices:listaUsuarios,
                message:"Usuario:"
            }
        ])
        store.set('user',user.user)

    }
    
	clearDisplay()
    store.set('evento','')
    // store.clearAll()
    const question=await prompt({
        type:'list',
        name:"name",
        message:'MENU',
        pageSize:15,
        choices:['Procurar','Entrada','Saida','Imprimir',new inquirer.Separator(),"OS_Ativas",'Info',new inquirer.Separator(),'EXIT',new inquirer.Separator()]
    })
    // choices:['Procurar','Entrada','Saida','Imprimir',new inquirer.Separator(),"Renomear","OS_Ativas","Grupos","Grupos/Modelos",'Cadastrar','Info','Deletar','Geral',new inquirer.Separator(),'EXIT',new inquirer.Separator()]

    
    
    ///////OS ATIVAS
    
    const osAtivas=async()=>{
        
        clog(await osBar())

        const sairParaOMenu=await prompt({
            type:'confirm',
            name:'sair_menu',
            message:"Enter para sair!"
        })
        sairParaOMenu.sair_menu?menu():menu()
        
    }

    /////////cadastrar

    const cadastrar=async()=>{
        try {

            if(store.get("modelo")){
                clog(store.get("modelo"))
                var newCad=await prompt([
                    {
                        type:'input',
                        name:"patrimonio",
                        message:'Patrimonio:'
                    }
                ])

                newCad.data=moment().format('DD/MM/YYYY')
                newCad.user='admin'
                newCad.evento='deposito'
                newCad.info=''
                newCad.modelo=store.get('modelo')
                newCad.grupo=store.get('grupo')

                
                if(newCad.patrimonio.trim().match(/([0-9])\d{5,5}/g)){
                    try {
                        await collection.insertOne(newCad)
                        clog(`Patrimonio:${colors.green(newCad.patrimonio).bold}  Cadastrado`)
                        cadastrar()
                    } catch (error) {
                        clog(colors.red('Patrimonio já cadastrado !!!'))
                        cadastrar()
                    }
                }else{
                    store.set('modelo','')
                    store.set('grupo','')
                    cadastrar()
                }
            }else{
                clearDisplay()

                const listaGrupos=await prompt([
                    {
                        type:'list',
                        name:"grupo",
                        choices:listarGrupos,
                        message:"Grupo:"
                        
                    }
                ])
                var selectModelo=await allType(listaGrupos.grupo)

                selectModelo.unshift(new inquirer.Separator())
                selectModelo.unshift('MENU')
                selectModelo.unshift("NOVO MODELO")



                const listaModelos=await prompt([
                    {
                        type:'list',
                        name:"modelo",
                        choices:selectModelo,
                        message:"Modelo:",
                        pageSize:35
                    }
                ])

                switch (listaModelos.modelo ) {
                    case "NOVO MODELO":
                        const question=await prompt([
                            {
                                type:'input',
                                name:"modelo",
                                message:'Modelo:'
                            },
                        ])
                        question.modelo=question.modelo.trim()
                        question.modelo=question.modelo.replaceAll(/[/,!,?,*,+,%,@,`,~,;,:]/g,'-');
                        if(question.modelo){
                            store.set('grupo',listaGrupos.grupo)
                            store.set('modelo',question.modelo)
                            cadastrar() 
                        }else{
                            store.set('modelo',"")
                            store.set('grupo',"")
                            menu()
                        }
                        break;
                    case "MENU":
                        store.set('modelo',"")
                        store.set('grupo',"")
                            menu()
                    break;
                    default:
                        store.set('modelo',listaModelos.modelo)
                        store.set('grupo',listaGrupos.grupo)
                        cadastrar() 
                        break;
                }
            }
        } catch (error) {
            menu()
        }
    }

    ////////deletar

    const deletar=async()=>{
        const question=await prompt([
            {
                type:'input',
                name:"patrimonio",
                message:'Patrimonio'
            }
        ])
        const password=await prompt([
            {
                type:'password',
                name:"password",
                message:'senha do admin:'
            }
        ])

        if(question.patrimonio && password.password==process.env.ADMIN_PASSWORD){

            try {
                const result=await collection.deleteOne({'patrimonio':question.patrimonio})
                if(result.deletedCount==1){
                    clog(`Patrimonio:${colors.green(question.patrimonio)} DELETADO!!!`)
                    setTimeout(()=>{
                        menu()
                    },2000)
                }else{
                    clog(colors.red('Não tem equipamento relacionado a esse patrimonio !!!'))
                    setTimeout(()=>{
                        menu()
                    },2000)
                }
            } catch (error) {
                clog(colors.red('Não tem equipamento relacionado a esse patrimonio !!!'))
                setTimeout(()=>{
                    menu()
                },2000)
            }
        }else{
            menu()
        }
    }
    ///////// geraozao

    const geral=async()=>{
        clearDisplay()
        const result=await collection.find().toArray();            
        var result2= createArr(result)
  
        var txtPrint=''

        result2.forEach((el)=>{
            clog(`${colors.green(el.qty).bold}${'\u2008'.repeat(4 - el.qty.length)}| ${el.grupo?colors.cyan(el.grupo).bold :"..."}${el.grupo?'\u2008'.repeat(12 - el.grupo.length):'\u2008'.repeat(9)}| ${colors.yellow(el.modelo).bold}${'\u2008'.repeat(45 - el.modelo.length)}| ${colors.red(el.patrimonio).bold}`)
            txtPrint+=`${el.qty}${'\u2008'.repeat(4 - el.qty.length)}| ${el.grupo?el.grupo:"..."}${el.grupo?'\u2008'.repeat(12 - el.grupo.length):'\u2008'.repeat(9)}| ${el.modelo}${'\u2008'.repeat(45 - el.modelo.length)}| ${el.patrimonio}\n`
        })
        
        fs.writeFileSync(`./PDF/geral.txt`,txtPrint,{ encoding: "utf8"}) 
    }
    

    //////////imprimir

    const imprimir=async()=>{    
        clearDisplay()
        var selectEventoIprimir=await osBar()
        selectEventoIprimir.push(new inquirer.Separator())
        selectEventoIprimir.push("Patrimonio")
        selectEventoIprimir.push('MENU')
        selectEventoIprimir.push(new inquirer.Separator())
        const listaEventos=await prompt([
            {
                type:'list',
                name:"eventos",
                choices:selectEventoIprimir,
                message:"Evento:",
                pageSize:35
            }
        ])

        switch (listaEventos.eventos) {
            case "Patrimonio":
                const question=await prompt([
                    {
                        type:'input',
                        name:"patrimonio",
                        message:'--------------------evento ou patrimonio--------------------\n'
                    }
                ])

                try {
                    clearDisplay()
                    if(question.patrimonio){    
                        const result=await collection.find({$or:[{'patrimonio':{$regex:question.patrimonio}},{'modelo':{ $regex: question.patrimonio}}]}).toArray();
                        
                        var result2=await createArr(result)
                        result2=result2.sort((a, b) => {
                            if (a.grupo < b.grupo) return -1;
                            if (a.grupo > b.grupo) return 1;
                            return 0;
                          });

                        result2.forEach((el)=>{
                            clog(`${colors.green(el.qty).bold} | ${colors.cyan(el.grupo).bold} | ${colors.yellow(el.modelo).bold}`)
                        })
                        
                        const  confirm=await prompt({
                            name:"printer",
                            message:"imprimir?",
                            default: false,
                            type:"confirm",
                        })

                        if(result.length >0 && confirm.printer){

                            const doc = new PDFDocument({ margin: 30, size: 'A4'});
        
                            doc.pipe(fs.createWriteStream(`pdf/${question.patrimonio}.pdf`));
                            doc
                                .font('Roboto-Italic.ttf')
                                .fontSize(11)
                                .text(`                                                                                    ${question.patrimonio}`);

                            const table = {
                                headers: [
                                   { label:"Quantidade", property: 'qty', width: 50,renderer: (value, indexColumn, indexRow, row) => {
                                        return `  ${value}` }},
                                    { label:"Modelo", property: 'modelo', width: 90, renderer: null  }, 
                                    { label:"Patrimonio", property: 'patrimonio', width: 400, renderer: null }, 
                                    
                                ],
                                datas: result2}
                            doc.moveDown()
                            doc.table(table, {
                                prepareHeader: () => doc.font('Roboto-Italic.ttf').fontSize(8),
                                prepareRow: (row ,indexColumn, indexRow, rectRow) => {
                                doc.font('Roboto-Italic.ttf').fontSize(8);
                                indexColumn === 0 && doc.addBackground(rectRow, (indexRow % 2 ? '#808080' : '#606060'), 0.15);
                                },
                                });
        
                            doc.end();
                            

                            os.type()==="Linux"?open(`pdf/${question.patrimonio}.pdf`,"firefox"):open(`pdf/${question.patrimonio}.pdf`,{app:"google chrome"})
                            
                        }else{
                            clog(colors.red('------------------------- OS não exite -------------------------'))
                        }
                        menu()
                    }else{
                        menu()
                    }   
                } catch (error) {
                    menu()
                }
                break;
            case 'MENU':
                menu()
                break;
        
            default:
                    try {
                        clearDisplay()
                        
                        if(listaEventos.eventos){
                            const result=await collection.find({$or:[{'evento':listaEventos.eventos}]}).toArray();            
                            var result2=await createArr(result)

                            result2=result2.sort((a, b) => {
                                if (a.grupo < b.grupo) return -1;
                                if (a.grupo > b.grupo) return 1;
                                return 0;
                              });

                            var txtPrint=''

                            result2.forEach((el)=>{
                                clog(`${colors.green(el.qty).bold}${'\u2008'.repeat(3 - el.qty.length)}| ${el.grupo?colors.cyan(el.grupo).bold :"..."}${el.grupo?'\u2008'.repeat(12 - el.grupo.length):'\u2008'.repeat(9)}| ${colors.yellow(el.modelo).bold}${'\u2008'.repeat(40 - el.modelo.length)}| ${colors.red(el.patrimonio).bold}`)
                                txtPrint+=`${el.qty}${'\u2008'.repeat(3 - el.qty.length)}| ${el.grupo?el.grupo:"..."}${el.grupo?'\u2008'.repeat(12 - el.grupo.length):'\u2008'.repeat(9)}| ${el.modelo}${'\u2008'.repeat(40 - el.modelo.length)}| ${el.patrimonio}\n`
                            })
                            
                            fs.writeFileSync(`./PDF/${listaEventos.eventos}.txt`,txtPrint,{ encoding: "utf8"}) 

                            const  confirm=await prompt({
                                name:"printer",
                                message:"imprimir?",
                                default: false,
                                type:"confirm",
                            })
                            if(result.length >0 && confirm.printer){
            

                                const doc = new PDFDocument({ margin: 30, size: 'A4'});
            
                                doc.pipe(fs.createWriteStream(`pdf/${listaEventos.eventos}.pdf`));
                                doc
                                    .font('Roboto-Italic.ttf')
                                    .fontSize(11)
                                    .text(`                                                                                    ${result[0].evento}`);
            
                                const table = {
                                    headers: [
                                        { label:"Quantidade", property: 'qty', width: 50,renderer: (value, indexColumn, indexRow, row) => {
                                            return `  ${value}` }},
                                        { label:"Grupo", property: 'grupo', width: 70, renderer: null  }, 
                                        { label:"Modelo", property: 'modelo', width: 90, renderer: null  }, 
                                        { label:"Patrimonio", property: 'patrimonio', width: 400, renderer: null }, 
                                        
                                    ],
                                    datas: result2}
                                doc.moveDown()
                                doc.table(table, {
                                    prepareHeader: () => doc.font('Roboto-Italic.ttf').fontSize(8),
                                    prepareRow: (row ,indexColumn, indexRow, rectRow) => {
                                    doc.font('Roboto-Italic.ttf').fontSize(8);
                                    indexColumn === 0 && doc.addBackground(rectRow, (indexRow % 2 ? '#808080' : '#606060'), 0.15);
                                    },
                                    });
            
                                doc.end();
                                os.type()==="Linux"?open(`pdf/${listaEventos.eventos}.pdf`,"firefox"):open(`pdf/${listaEventos.eventos}.pdf`,{app:"google chrome"})
                                
                            }else{
                                clog(colors.red('------------------------- OS não exite -------------------------'))
                            }
                            menu()
                        }else{
                            menu()
                        }   
                    } catch (error) {
                        // console.log(error)
                        menu()
                    }
                break;
        }
    }

    ////////procurar

    const procurar=async(preOs)=>{
        const question=await prompt([
            {
                type:'input',
                name:"patrimonio",
                message:'--------------------evento / patrimonio / grupo --------------------\n'
            }
        ])
        try {
            clearDisplay()
            
            if(question.patrimonio!=""){
                const result=await collection.find({$or:[{'patrimonio':question.patrimonio},{'evento':question.patrimonio},{'modelo':{ $regex: question.patrimonio}},{'grupo':{ $regex: question.patrimonio}}]}).toArray();

                if(result.length >0){
                    
                    result.forEach(el => {
                        clog(`${colors.blue(el.patrimonio).bold} / ${el.grupo?colors.cyan(el.grupo).bold:"..."} / ${colors.yellow(el.modelo).bold}`)
                        clog(colors.cyan('        --------------'))
                        clog(`${colors.green(el.data).bold} ${colors.red(el.user).bold} Evento:${colors.green(el.evento).bold}`)
                        if(el.ultimoevento){clog(`Ultimo Evento:${colors.green(el.ultimoevento).bold} `)}
                        if(el.info){clog(colors.cyan(el.info).bold)}
                        clog(colors.yellow('----------------------------------------------------------------'))
                    })
                }else{
                    clog(colors.red('------------------Não cadastrado------------------'))
                }
                procurar()
            }else{
                menu()
            }
            
        } catch (error) {
            menu()
        }
    }

    ///////////saida

    var sair=[]

    const saida=async()=>{
        clearDisplay()
        if( store.get('evento')){
            let result=await collection.find({$and:[{"evento":store.get('evento')},{"modelo":store.get("qtyModel")}]}).toArray()

            monitor.draw(store.get("qtyModel"),result.length)
        }

        sair.forEach((el)=>{
            if(el.modelo==="Não Cadastrado"){
                console.log(`Patrimonio:${colors.yellow(el.patrimonio).bold} Modelo:${colors.red(el.modelo).bold}`)
            }else{
                console.log(`${colors.yellow(el.patrimonio).bold} | ${colors.green(el.modelo).bold}  ${el.info?"| "+colors.cyan(el.info).bold:''}`)
            }
        })
        if(store.get("evento")){
            
            const patrimonio=await prompt([
                {
                    type:'input',
                    name:"patrimonio",
                    message:'Patrimonio:'
                }
            ])
            
            if(patrimonio.patrimonio){
                try {
                    const saiu=await collection.findOneAndUpdate(patrimonio,{ $set : { "data" : moment().format('DD/MM/YYYY'),'user':store.get('user'),"evento":store.get('evento')} })
                    if(sair.length ==10) {sair.shift()}
                    store.set("qtyModel",saiu.modelo)
                    if(!checkAvailability(sair,{patrimonio:saiu.patrimonio,modelo:saiu.modelo,info:saiu.info,evento:saiu.evento})) {
                        sair.push({patrimonio:saiu.patrimonio,modelo:saiu.modelo,info:saiu.info,evento:saiu.evento}); // Adiciona o objeto ao array
                        play("./beep.wav")
                    }
                    saida()
                } catch (error) {
                    if(sair.length ==10) {sair.shift()}
    
                    if (!sair.some(obj => JSON.stringify(obj) === JSON.stringify({patrimonio:patrimonio.patrimonio,modelo:"Não Cadastrado"}))) {
                        sair.push({patrimonio:patrimonio.patrimonio,modelo:"Não Cadastrado"})
                    }
                    saida()
                }
    
            }else{
                menu()
            }

        }else{
            var selectEvento=await osBar()
            selectEvento.push(new inquirer.Separator())
            selectEvento.push("NOVO EVENTO")
            selectEvento.push('MENU')
            selectEvento.push(new inquirer.Separator())
            const listaEventos=await prompt([
                {
                    type:'list',
                    name:"eventos",
                    choices:selectEvento,
                    message:"Evento:"
    
                }
            ])
            switch (listaEventos.eventos ) {
                case "NOVO EVENTO":
                    const evento=await prompt([
                        {
                            type:'input',
                            name:"evento",
                            message:'EVENTO:'
                        }
                    ])
                    evento.evento=evento.evento.trim()
                    evento.evento=evento.evento.replace(/[/,!,?,*,+,%,@,`,~,;,:]/g, '-');
                    store.set('evento',evento.evento)
    
                    saida()
                    break;
                case "MENU":
                        menu()
                break;
                default:
                    store.set('evento',listaEventos.eventos)
                    saida()
                    break;
            }
        }
    }

    ////////entrada

    var arrRetorno=[]
    const entrada=async()=>{
        clearDisplay()
        arrRetorno.forEach((el)=>{
            if(el.modelo=='NÃO CADASTRADO'){
                clog(`Patrimonio:${colors.green(el.patrimonio).bold} Modelo:${colors.red(el.modelo).bold}`)
            }else{
                clog(`${colors.blue(el.evento?el.evento:"deposito").bold} | ${colors.yellow(el.patrimonio).bold} | ${colors.green(el.modelo).bold} ${el.info?"|" +colors.cyan(el.info).bold:''}`)
            }
        })

        let patrimonioentrada=await prompt([
            {
                type:'input',
                name:"patrimonio",
                message:'PATRIMONIO:'
            }
        ])
    
        if(patrimonioentrada.patrimonio){
            let tester=await collection.findOne({'patrimonio':patrimonioentrada.patrimonio})
            if(tester){
                if(tester.evento=="deposito"){
                    clog(`${colors.yellow("Não estava em Evento!!")}`)
                    play('./beep.wav')
                    setTimeout(()=>{entrada()},500)
                }
                else{
                    try {
        
                        const retorno=await collection.findOneAndUpdate(patrimonioentrada,{ $set : { "data" : moment().format('DD/MM/YYYY'),'user':store.get("user"),"evento":"deposito",'ultimoevento':tester.evento} })
                        if(arrRetorno.length == 10){arrRetorno.shift()}
                        arrRetorno.push({patrimonio:retorno.patrimonio,modelo:retorno.modelo,evento:tester.evento,info:retorno.info})
                        play('./beep.wav')
                        entrada()
                        
                    } catch (error) {
                        entrada()
                    }
                }   
            }else{
                clog(`${colors.red("Não Cadastrado")}`)
                if(arrRetorno.length == 10){arrRetorno.shift()}
                arrRetorno.push({patrimonio:patrimonioentrada.patrimonio,modelo:'NÃO CADASTRADO'})
                play('./beep.wav')
                setTimeout(()=>{entrada()},500)
            }
        }else{
            menu()
        }
    }

    //////add to group

    const toGroup=async()=>{
        clearDisplay()

        const patrimonio=await prompt([
            {
                type:'input',
                name:"patrimonio",
                message:"Patrimonio:"
            }
        ])

        if(patrimonio.patrimonio.trim().match(/([0-9])\d{5,5}/g)){

            const grupoAdd=await prompt([
                {
                    type:'list',
                    name:"grupo",
                    choices:listarGrupos,
                    message:"Grupo:"
                }
            ])
            
            if(grupoAdd.grupo!=""){
                try {   
                    await collection.updateOne({'patrimonio':patrimonio.patrimonio},{$set:{"grupo":grupoAdd.grupo}})
                    setTimeout(()=>{
                        toGroup()
                    },1000)
                } catch (error) {
                    clog(colors.red('Erro!!!'))
                    setTimeout(()=>{
                        menu()
                    },2000)
                }
            }else{
                menu()   
            }
        }else{
            menu()
        }
    }
      //////add all to group

      const AlltoGroup=async()=>{
          clearDisplay()
          const grupoAdd=await prompt([
              {
                  type:'list',
                  name:"grupo",
                  choices:listarGrupos,
                  message:"Grupo:"
              }
          ])

          const selectModelo=await allType(grupoAdd.grupo)
          selectModelo.unshift(new inquirer.Separator())
          selectModelo.unshift('MENU')
          selectModelo.unshift(new inquirer.Separator())
          
        
        const modelo=await prompt([
            {
                type:'list',
                name:"modelo",
                choices:selectModelo,      
                message:"selecione o modelo:",
                pageSize:35
            }
        ]);
      
        switch(modelo.modelo){
            case "MENU" :
                menu()
                break;
            default:
        
                if(grupoAdd.grupo && modelo.modelo){
        
                    try {  
                        const result=await collection.updateMany({'modelo':modelo.modelo},{$set:{"grupo":grupoAdd.grupo}})
                        setTimeout(()=>{
                            menu()
                        },2000)
                    } catch (error) {
                    clog(colors.red('Erro!!!'))
                    setTimeout(()=>{
                        menu()
                    },2000)
                } 
                }else{
                    menu()   
                }
        }
    }

    //////renomear

    const renomear=async()=>{

        var selectModelo=await allType()
        selectModelo.unshift(new inquirer.Separator())
        selectModelo.unshift('MENU')
        selectModelo.unshift(new inquirer.Separator())
        

        const oldName=await prompt([
            {
                type:'list',
                name:"oldname",
                choices:selectModelo,
                message:"Modelo:",
                pageSize:35
            }
        ])
        switch(oldName.oldname){
            case "MENU":
                menu()
                break;
            default :
            const newName=await prompt([
                {
                    type:'input',
                    name:"newname",
                    message:'novo Nome:'
                }
            ])
            newName.newname.trim()
            newName.newname.replaceAll(/[/,!,?,*,+,%,@,`,~,;,:]/g, ' ');
    
            const password=await prompt([
                {
                    type:'password',
                    name:"password",
                    message:'senha do admin:'
                }
            ])
    
            if(oldName.oldname!=""&& newName.newname!=""&& password.password==process.env.ADMIN_PASSWORD){
      
                var recursive=true
                try {
                    do {
                        const result=await collection.findOneAndUpdate({'modelo':oldName.oldname},{$set:{"modelo":newName.newname}})
                        result?recursive=true:recursive=false
                    } while (recursive);
                    setTimeout(()=>{
                        menu()
                    },1000)
                } catch (error) {
                    clog(colors.red('Erro!!!'))
                    setTimeout(()=>{
                        menu()
                    },2000)
                }
            }else{
                menu()
            }
        }
    }
    /////////info

    const info=async()=>{
        let patrimonio=await prompt(
            {
                type:'input',
                name:"patrimonio",
                message:"patrimonio"
            }
        )

        if(patrimonio.patrimonio.trim().match(/([0-9])\d{5,5}/g)){
            
            let infor=await prompt(
                {
                    type:'input',
                    name:"info",
                    message:"info:"
                }
            )
            try {
                await collection.findOneAndUpdate({'patrimonio':patrimonio.patrimonio},{$set:{"info":infor.info}})
                info()
            } catch (error) {
                clog(`${colors.red(error)}`)
                setTimeout(()=>{
                    menu()
                },2000)
            }
        }else{
            setTimeout(()=>{
                menu()
            },500)
        }
    }
    ////menu

    switch (question.name) {
        case "Procurar":
            procurar()
            break;
        case "Cadastrar":
            cadastrar()
            break;
        case "Deletar":
            deletar()
            break;
        case "Saida":
            saida() 
        break;
        case "Entrada":
            entrada()  
        break;
        case "Imprimir":
            imprimir()
        break;
        case "Renomear":
            renomear()
        break;
        case "OS_Ativas":
            osAtivas()
        break;
        case "Grupos":
            toGroup()
        break;
        case "Grupos/Modelos":
            AlltoGroup()
        break;
        case "Info":
            clearDisplay()
            info()
            break;
        case "Geral":
            geral()
        break;
        case 'EXIT':
            clearDisplay()
            exit(1)
        default:
            menu()
            break;
    }
}

menu()
