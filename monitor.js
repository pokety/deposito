
import colors from 'colors'

export default class Monitor {

    constructor(){
        this.equipament
        this.quantidade=''
    }
    draw(equipamento,quantidade){
        
        
        var space=''
        // let tamanho=(40-this.equipament.length)
        // for(let i=0;i<tamanho;i++){
        //     space+=' '
        // }

        console.log(`Equipamento: ${colors.green(equipamento?equipamento:"...")} ${space}| Quantidade : ${colors.green(quantidade)} \n`)

    }

}

// const monitor =new Monitor()
// monitor.setMonitor("projetor",'34')

// monitor.draw()