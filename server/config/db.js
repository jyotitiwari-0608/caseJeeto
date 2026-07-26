const uri = process.env.MONGO_URI;
const mongoose = require('mongoose')
const connectDb = async()=>{
    try{
        const conn = await mongoose.connect(uri);
    console.log(`connected to database`);
    }
    catch(err){
    console.log(`not connected to database`);
    console.log(`error : ${err.message}`)
    }
}
module.exports = connectDb;