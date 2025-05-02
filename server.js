import express from "express";

const app = express();

const port = process.env.PORT || 8000;

app.get('/' , (req,res) => {
    res.send('server is ready')
});

app.listen(port, ()=>{
    console.log(`App running at http://localhost:${port}`);
})
