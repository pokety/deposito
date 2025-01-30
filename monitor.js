import colors from 'colors'

export default class Monitor {
    constructor(){
        this.equipament
        this.quantidade=''
    }
    draw(equipamento,quantidade){      
        var space=''
        console.log(`Equipamento: ${colors.green(equipamento?equipamento:"...")} ${space}| Quantidade : ${colors.green(quantidade)} \n`)
    }
}
