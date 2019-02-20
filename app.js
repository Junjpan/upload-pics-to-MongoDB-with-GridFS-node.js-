let express=require('express');
let path=require('path');
let mongoose=require('mongoose');
let bodyParser=require('body-parser');
let crypto=require('crypto')//a core node.js modules, to generate the file name
let multer=require("multer");//multer is a node.js middleware for handling multipart/form-data where is primarily used for uploading files.
let GridFsStorage=require('multer-gridfs-storage')//GridFS storage engine for Multer to store uploaded files directly to MongoDB
let Grid=require('gridfs-stream')//
let methodOverride=require('method-override');//using method-override middleware, you don't need to call Ajax to delete the file in Node.js 

let app=express();

//bring in middleware
app.use(bodyParser.json());
app.use(methodOverride('_method'));

//Mongo URI
const mongoURI="mongodb://localhost:27017/mongouploads"


//create mongo connection
const connection=mongoose.createConnection(mongoURI,{ useNewUrlParser: true });


//init gfs
let gfs;

connection.once('open',()=>{
    //init stream
   gfs=Grid(connection.db,mongoose.mongo);
   gfs.collection('uploads');// define what collection name you want.and in mongodb it will show uploads.chunks and uploads.files
})

//create storage engine or storage object -https://www.npmjs.com/package/multer-gridfs-storage
const storage = new GridFsStorage({
    url: mongoURI,
    file: (req, file) => {
      return new Promise((resolve, reject) => {
        crypto.randomBytes(16, (err, buf) => {
          if (err) {
            return reject(err);
          }
          const filename = buf.toString('hex') + path.extname(file.originalname);
          const fileInfo = {
            filename: filename,
            bucketName: 'uploads'// it should be match the gfs collection name
          };
          resolve(fileInfo);
        });
      });
    }
  });
  const upload = multer({ storage });// we set up a POST form with /upload route and use upload vairable as middleware and upload the data to the database

//set up a view engineer

app.set("view engine", "ejs")

//load form
app.get('/',(req,res)=>{
  gfs.files.find().toArray((err,datas)=>{
    // check if file exist
    if(!datas||datas.length==0){
     res.render('index',{files:false})
    } else{
     datas.map(data=>{
      if(data.contentType=="image/jpeg"||data.contentType=="img/png"){
        data.isImage=true
      }else{
        data.isImage=false
      }
     })
     res.render('index',{files:datas})
    }
  
    
  })
});

// upload file to db. 
//upload.single("the name of the form's file input field")just upload a single file at a time. use upload.array()to upload mutiple files
app.post('/upload',upload.single("myfile"),(req,res)=>{
//file will save in the mongo right away after we select the file to upload.
//res.json({file:req.file});//Multer will add a file property for request when it's a single file upload.
res.redirect('/');
})

//get all the files
app.get('/file',(req,res)=>{
gfs.files.find().toArray((err,data)=>{
  // check if file exist
  if(!data||data.length==0){
   return res.status(404).json({err:"No Files Exist."})
  } 
  //Files exist
  return res.json(data);
})
})

//display a sigle file in json format
app.get('/file/:filename',(req,res)=>{
  gfs.files.findOne({filename:req.params.filename},(err,data)=>{
    if(!data){
      return res.status(404).json({err:"No File Exist."})
     } 
     return res.json(data);
  })
  })

 //display a sigle imgae

  app.get('/image/:filename',(req,res)=>{
  gfs.files.findOne({filename:req.params.filename},(err,data)=>{
    if(!data){
      return res.status(404).json({err:"No File Exist."})
     } 
    // check if it is image  
if (data.contentType=="image/jpeg"||data.contentType=="img/png") {
      //read output to browser
      //console.log(data);
      const readstream=gfs.createReadStream(data.filename);
      readstream.pipe(res);
    } else{
      return res.status(404).json({err:"Not an image"})
    }
     
  })
  })

//@delete /file/:id
app.delete('/file/:id',(req,res)=>{
  gfs.remove({_id:req.params.id,root:"uploads"},(err,file)=>{//have to put root here,otherwise it will not work
    if(err){
      return res.status(404).json({err:err})
    }else{
      res.redirect('/');
    }
  })
})  

app.listen(3000,()=>{
    console.log("Server started on port 3000");
}) 

