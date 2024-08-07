const Admin = require("../../models/auth/admin");
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const secret = process.env.JWT_SECRET

exports.adminSignupController = async (req, res)=>{
    const {firstName, lastName, email, password} = req.body;
    
    try {
        const findUser = await Admin.findOne({email})
        if(findUser) return res.status(400).json({msg: "Admin already exists with this email , please try another email."})
        const bcryptPassword = await bcrypt.hash(password, 10)
        const newAdmin = new Admin({firstName, lastName, email, password:bcryptPassword})
        await newAdmin.save()
        
        const payload = { id: newUser._id, name: newUser.name, email: newUser.email, wallet: newUser.wallet };

       return res.send(200).json({msg: "Admin created successfully", data : payload})
    } catch (error) {
       return res.status(500).json({msg : "Server Error", error})
    }
}

exports.adminLoginController = async (req, res)=>{
    try {
        
  
    const {email, password} = req.body;
    const findUser = await Admin.findOne({email})
    if(!findUser){
      return  res.status(400).json({msg : "Admin doesn't exist with this email"})
    }
    if(!findUser.isActive){
      return  res.status(400).json({msg : "Admin is not active now plsease contact SuperAdmin"})
    }
    const isMatch = await bcrypt.compare(password, findUser.password)
    if(!isMatch){
       return res.status(400).json({msg : "Invalid password"})
    }

     // Create JWT payload and token
     const payload = {
        id: findUser._id,
        email: findUser.email,
        name: findUser.name,
        isActive: findUser.isActive,
        role: findUser.role,
        quizes: findUser.quizes,
        createdBy: findUser.createdBy,
        updatedBy: findUser.updatedBy
    };
   

    const token = jwt.sign(payload, secret);

    return res.json({msg: "Admin logged in successfully", data : payload, token})
} catch (error) {
      return res.status(500).json({msg : "Server Error", error})  
}
}