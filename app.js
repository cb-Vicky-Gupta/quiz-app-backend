const express = require('express')
const app = express()
const mongoose = require('mongoose')
const cors = require('cors')
require('dotenv').config()
app.use(cors())
app.use(express.json())
const adminRouter = require('./routes/admin/index')
const superRouter = require('./routes/super-admin/index')
const userRouter = require('./routes/users/index')
const paymentRouter = require('./routes/payment/route')
const reportRoutes = require('./routes/common/index');





// db connection
const url = process.env.MONGO_URL
const port = process.env.PORT
mongoose.connect(url)
    .then(() => {
        console.log("Connected to mongoDB")
        app.listen(port, () => {
            console.log(`Server is running at port ${port}`);
        });
    })
    .catch((error) => {
        console.log("Error in conection to MongoDB", error)
    })

//main routers
app.use('/v1/admin', adminRouter)
app.use('/v1/super', superRouter)
app.use('/v1/user', userRouter)
app.use('/v1/payments', paymentRouter)
app.use('/v1', reportRoutes);

module.exports = app;
