const MenuManager = require('./menu-manager.cjs')


function APILoop(menuManager){
    menuManager.getPrompt(menuManager)
        .then((result)=>{
            console.clear()
            menuManager.handleInputs(result)
        })
        .then(()=>APILoop(menuManager))
        .catch(err=>console.log(err))
}

function init(){
    const menuManager=new MenuManager()
    APILoop(menuManager)
}

init()