'use strict'

import LanScan from "lan-scan";
import {MongoClient} from "mongodb";
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

dotenv.config()

const PORT = 27018;

const lanScan = new LanScan(PORT);
const [openIps] = await lanScan.scanNetwork();

var client
client=new MongoClient(`mongodb://${openIps}:27018`)


const db=client.db(process.env.DB)
const collection=db.collection(process.env.COLLECTION)

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
const allType=async()=>{
    let tudo=await collection.find().toArray()
    var modelo=[]
    tudo.forEach((el)=>{
        if(!modelo.includes(el.modelo)){
            modelo.push(el.modelo)
        }
    })
    return modelo.sort()
}
const menu=async()=>{
    
	clearDisplay()
    clog(await osBar())
    store.clearAll()
    const question=await prompt({
        type:'list',
        name:"name",
        message:'MENU',
        choices:['Procurar','Entrada','Saida','Imprimir',new inquirer.Separator(),"Renomear",'Cadastrar','Info','Deletar',new inquirer.Separator(),'EXIT',new inquirer.Separator()]
    })


    /////////cadastrar

    const cadastrar=async()=>{
        try {

            if(store.get("modelo")){
                clog(store.get("modelo"))
                const newCad=await prompt([
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
                if(newCad.patrimonio){
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
                    menu()
                }
            }else{
                clearDisplay()

                var selectModelo=await allType()
                selectModelo.unshift(new inquirer.Separator())
                selectModelo.unshift('MENU')
                selectModelo.unshift("NOVO MODELO")
                selectModelo.unshift(new inquirer.Separator())

                const listaModelos=await prompt([
                    {
                        type:'list',
                        name:"modelo",
                        choices:selectModelo
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
                        if(question.modelo){
                            store.set('modelo',question.modelo)
                            cadastrar() 
                        }else{
                            menu()
                        }
                        break;
                    case "MENU":
                            menu()
                    break;
                    default:
                        store.set('modelo',listaModelos.modelo)
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

        if(question.patrimonio!="" && password.password==process.env.ADMIN_PASSWORD){

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
                choices:selectEventoIprimir
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
                    
                    
                    if(question.patrimonio!=""){
                        
                        const result=await collection.find({$or:[{'patrimonio':question.patrimonio},{'modelo':{ $regex: question.patrimonio}}]}).toArray();
                        
                        const result2=await createArr(result)
                        result2.forEach((el)=>{
                            clog(`${colors.green(el.qty).bold} |  ${colors.yellow(el.modelo).bold}`)
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
                            const result2=await createArr(result)
                            result2.forEach((el)=>{
                                clog(`${colors.green(el.qty).bold} |  ${colors.yellow(el.modelo).bold} | ${colors.red(el.patrimonio).bold}`)
                            })
                            
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
                message:'--------------------evento ou patrimonio--------------------\n'
            }
        ])
        try {
            clearDisplay()
            
            if(question.patrimonio!=""){
                const result=await collection.find({$or:[{'patrimonio':question.patrimonio},{'evento':question.patrimonio},{'modelo':{ $regex: question.patrimonio}}]}).toArray();

                if(result.length >0){
                    
                    result.forEach(el => {
                        clog(`${colors.blue(el.patrimonio).bold} / ${colors.yellow(el.modelo).bold}`)
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
        sair.forEach((el)=>{
            if(el.modelo==="Não Cadastrado"){
                clog(`Patrimonio:${colors.yellow(el.patrimonio).bold} Modelo:${colors.red(el.modelo).bold}`)
            }else{
                clog(`${colors.yellow(el.patrimonio).bold} |${colors.green(el.modelo).bold} ${el.info?colors.cyan(el.info).bold:''}`)
            }
        })
        store.get('usuarioSaida')!=undefined?clog(store.get('usuarioSaida')):clog('selecione usuario')
        if(store.get('usuarioSaida')){
            const patrimonio=await prompt([
                {
                    type:'input',
                    name:"patrimonio",
                    message:'Patrimonio:'
                }
            ])
            
            if(patrimonio.patrimonio!=''){
                clog(store.get('usuarioSaida'))
                clog(store.get('dataevento'))
                try {
                    const saiu=await collection.findOneAndUpdate(patrimonio,{ $set : { "data" : moment().format('DD/MM/YYYY'),'user':store.get('usuarioSaida'),"evento":store.get('evento')} })
                    if(sair.length ==10) {sair.shift()}

                    if (!sair.some(obj => JSON.stringify(obj) === JSON.stringify({patrimonio:saiu.patrimonio,modelo:saiu.modelo,info:saiu.info}))) {
                        sair.push({patrimonio:saiu.patrimonio,modelo:saiu.modelo,info:saiu.info}); // Adiciona o objeto ao array
                    }

                    play("./beep.wav")
                    saida()
                } catch (error) {
                    if(sair.length ==10) {sair.shift()}

                    if (!sair.some(obj => JSON.stringify(obj) === JSON.stringify({patrimonio:patrimonio.patrimonio,modelo:"Não Cadastrado"}))) {

                        sair.push({patrimonio:patrimonio.patrimonio,modelo:"Não Cadastrado"})
                    }
                    play('./beep.wav')
                    saida()
                }

            }else{
                menu()
            }
            
            
        }else{
            const user=await prompt([
                {
                    type:'list',
                    name:"user",
                    choices:['claudio','dourado','MENU','EXIT']
                }
            ])
            
            
            var selectEvento=await osBar()
            selectEvento.push(new inquirer.Separator())
            selectEvento.push("NOVO EVENTO")
            selectEvento.push('MENU')
            selectEvento.push(new inquirer.Separator())
            const listaEventos=await prompt([
                {
                    type:'list',
                    name:"eventos",
                    choices:selectEvento
                }
            ])

            switch (user.user) {
                case 'claudio':
                    store.set('usuarioSaida','claudio')
                    clearDisplay()
                    switch (listaEventos.eventos ) {
                        case "NOVO EVENTO":
                            const evento=await prompt([
                                {
                                    type:'input',
                                    name:"evento",
                                    message:'EVENTO:'
                                }
                            ])

                            store.set('evento',evento.evento.trim())

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

                    break;
                case 'dourado':
                    store.set('usuarioSaida','dourado')
                    clearDisplay()
                    switch (listaEventos.eventos ) {
                        case "NOVO EVENTO":
                            const evento=await prompt([
                                {
                                    type:'input',
                                    name:"evento",
                                    message:'EVENTO:'
                                }
                            ])

                            store.set('evento',evento.evento.trim())

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

                    break;
                case 'EXIT':
                    exit(1)
                break;
                case 'MENU':
                    menu()
                break;
                default:
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
                clog(`${colors.blue(el.evento?el.evento:"deposito").bold} |${colors.yellow(el.patrimonio).bold} |${colors.green(el.modelo).bold} ${el.info?"|" +colors.cyan(el.info).bold:''}`)
            }
        })
        if(store.get("usuarioentrada")){

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
            
                            const retorno=await collection.findOneAndUpdate(patrimonioentrada,{ $set : { "data" : moment().format('DD/MM/YYYY'),'user':store.get("usuarioentrada"),"evento":"deposito",'ultimoevento':tester.evento} })
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
                store.set("usuarioentrada","")
                menu()
            }
        }else{
            let usuarioEntrada=await prompt([
                {
                    type:'list',
                    name:"usuarioentrada",
                    choices:["claudio","dourado"]
                }
            ])
            store.set("usuarioentrada",usuarioEntrada.usuarioentrada)
            entrada()
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
                choices:selectModelo
            }
        ])

        const newName=await prompt([
            {
                type:'input',
                name:"newname",
                message:'novo Nome:'
            }
        ])
        const password=await prompt([
            {
                type:'password',
                name:"password",
                message:'senha do admin:'
            }
        ])

        if(oldName.oldname!=""&& newName.newname!="" && password.password==process.env.ADMIN_PASSWORD){
  
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
    /////////info

    const info=async()=>{
        let patrimonio=await prompt(
            {
                type:'input',
                name:"patrimonio",
                message:"patrimonio"
            }
        )

        if(patrimonio.patrimonio.trim()){
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
        case "Info":
            info()
            break;
        case "Serial":
            serial()
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