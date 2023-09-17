const inquirer = require('inquirer')
const axios = require('axios')
const Spinner = require('cli-spinner').Spinner

const spinner = new Spinner('Requesting... %s')

class MenuManager{
    constructor(){
        this.filmsKey={
            'A New Hope':1,
            'The Empire Strikes Back':2,
            'Return of the Jedi':3,
            'The Phantom Menace':4,
            'Attack of the Clones':5,
            'Revenge of the Sith':6,
            'Exit': null
        }
        this.promptKey={
            'film':this.filmPrompt,
            'ping film':this.filmPing,
            'type':this.typePrompt,
            'ping type':this.typePing,
            'specific':this.specificPrompt,
            'ping specific': this.specificPing,
            'return': this.returnPrompt
        }
        this.relevantTypes=['homeworld','films','species','vehicles','starships','residents','pilots','people']
        this.currMenu='film'
        this.chosenFilm=undefined
        this.chosenType=undefined
        this.filmData=undefined
        this.specificData=[]
        this.chosenSpecific=undefined
    }
    getPrompt(self){
        return this.promptKey[this.currMenu](self)
    }
    filmPrompt(self){
        return inquirer.prompt([
            {
                type: 'list',
                name:'film',
                message:'Welcome to Joey\'s Star Wars API interface!\n Which episode would you like to know more about?',
                choices: Object.keys(self.filmsKey)
            }
        ])
    }
    filmPing(self){
        spinner.start()
        return axios.get(`https://swapi.dev/api/films/${self.filmsKey[self.chosenFilm]}`)
    }
    typePrompt(){
        return inquirer.prompt([
            {
                type: 'list',
                name:'type',
                message:'Which of these would you like information on?',
                choices: ['Characters','Starships','Planets','Vehicles','Species','Back']
            }
        ])
    }
    typePing(self){
        spinner.start()
        return Promise.all(self.filmData[self.chosenType].map(object=>axios.get(object)))
    }
    specificPrompt(self){
        return inquirer.prompt([
            {
                type:'list',
                name:'specific',
                message:`We found ${self.specificData.length-1} ${self.chosenType} from ${self.chosenFilm}. Which one would you like to learn more about?`,
                choices: self.specificData
            }
        ])
    }
    specificPing(self){
        spinner.start()
        return axios.get(self.chosenSpecific)
            .then(response=>{
                let presentTypes=[]
                let typesKey=[]
                self.relevantTypes.forEach(type=>{
                    if (response.data.hasOwnProperty(type)) {
                        if (response.data[type]===null) delete response.data[type]
                        else {
                            presentTypes.push(response.data[type])
                            if (typeof response.data[type]==='string') typesKey.push(type)
                            else typesKey.push(Array(response.data[type].length).fill(type))
                    }
                    }
                })
                presentTypes = presentTypes.flat()
                typesKey=typesKey.flat()
                return Promise.all(presentTypes.map(obj=>axios.get(obj)).concat([typesKey,response]))
            })
    }
    returnPrompt(){
        return inquirer.prompt([
            {
                type:'list',
                name:'return',
                message: ' ',
                choices:['Go Back', 'Main Menu']
            }
        ])
    }

    handleInputs(response){
        switch(this.currMenu){
            case 'film':
                if (response.film==='Exit') throw ''
                else {
                    this.chosenFilm=response.film
                    this.currMenu='ping film'
                }
                break
            case 'ping film':
                this.filmData = response.data
                console.log('\x1b[33m%s\x1b[0m','OPENING CRAWL:\n'+this.filmData.opening_crawl)
                console.table(this.removeExtraKeys(this.filmData,['episode_id','opening_crawl','characters','planets','starships','vehicles','species','created','edited','url']))
                spinner.stop(true)
                this.currMenu='type'
                break
            case 'type':
                if (response.type==='Back'){
                    this.currMenu = 'film'
                    break
                } else {
                    this.chosenType = response.type.toLowerCase()
                    this.currMenu = 'ping type'
                    break
                }
            case 'ping type':
                spinner.stop(true)
                this.specificData = response.map(object=>object.data.name).concat('Back')
                this.currMenu='specific'
                break
            case 'specific':
                if (response.specific==='Back'){
                    this.currMenu='ping film'
                    break
                } else {
                    this.chosenSpecific = this.filmData[this.chosenType][this.specificData.indexOf(response.specific)]
                    this.currMenu = 'ping specific'
                    break
                }
            case 'ping specific':
                spinner.stop(true)
                const actual = response[response.length-1].data
                this.relevantTypes.forEach(type=>{
                    if (actual.hasOwnProperty(type)) actual[type]=[]
                })
                response[response.length-2].forEach((type,index)=>{
                    if (type==='films') actual[type].push(response[index].data.title)
                    else actual[type].push(response[index].data.name)
                })
                Object.keys(actual).forEach(key=>{
                    if (Array.isArray(actual[key])){
                        if (!actual[key].length) {
                            if (key==='species') actual[key]='Human'
                            else delete actual[key]
                        }
                        else actual[key]=actual[key].join(', ')
                    }
                })
                console.table(this.formatData(actual))
                this.currMenu = 'return'
                break
            case 'return':
                if (response.return==='Go Back') this.currMenu = 'specific'
                else this.currMenu = 'film'
                break
        }
    }
    removeExtraKeys(data,keep){
        return Object.keys(data)
        .filter(key=>!keep.includes(key))
        .reduce((acc,curr)=>{
            acc[
                curr.split('_').map(word=>word[0].toUpperCase()+word.slice(1)).join(' ')
            ]=data[curr]
            return acc
        },{})
    }
    formatData(data){
        function regexCheck(property,add){
            if (/[0-9]/.test(data[property])) data[property]+=add
        }
        switch (this.chosenType){
            case 'characters':
                regexCheck('height', 'cm')
                regexCheck('mass', 'kg')
                break
            case 'planets':
                regexCheck('rotation_period', ' days')
                regexCheck('orbital_period',' days')
                regexCheck('diameter', 'km')
                regexCheck('surface_water','%')
                break
            case 'starships':
                regexCheck('length','m')
                regexCheck('max_atmosphering_speed','km/h') 
                regexCheck('cargo_capacity','kg') 
                regexCheck('MGLT',' megalight/h')   
                break
            case 'species':
                regexCheck('average_height','cm')  
                regexCheck('average_lifespan',' years')  
                break
            case 'vehicles':
                regexCheck('length','m') 
                regexCheck('max_atmosphering_speed','km/h') 
                regexCheck('cargo_capacity','kg') 
                break
        }
        return this.removeExtraKeys(data,['created','edited','url'])
    }
}

module.exports = MenuManager