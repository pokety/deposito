import dotenv from 'dotenv'
import {MongoClient} from "mongodb";
import {createArr} from "./modules.js"
import _ from "lodash"

dotenv.config()

var client
client=new MongoClient(process.env.URI)

const db=client.db(process.env.DB)
const collection=db.collection(process.env.COLLECTION)


const osBar=async()=>{
    const tudo=await collection.find().toArray()
    var os=[]
    tudo.forEach((el)=>{
        if(!os.includes(el.evento)){
            os.push(el.evento)
        }
    })
    var os1 = os.filter((items)=>{return items != "deposito"})
    return os1.sort()
}

const docs=await osBar()
var allEventos=[]

for(let i=0;i<docs.length;i++){
    let result=await collection.find({'evento':docs[i]}).toArray()

    let arr=createArr(result)

    allEventos.push({[docs[i]]:arr})
}


fetch(process.env.URIAPI,{
    method:"POST",
    // headers:{
    //     "Content-Type":"application/json"
    // },
    body:JSON.stringify(_.flattenDepth(allEventos,1))
})