const app = document.querySelector('#app')
if (!app) throw new Error('main: #app element missing from index.html')

app.textContent = 'ThingBlock'
