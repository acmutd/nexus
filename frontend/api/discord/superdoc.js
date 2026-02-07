const express = require('express');
const router = express.Router();
const multer = require('multer');


const storage = multer.memoryStorage();
const upload = multer({storage:storage});




router.post('/pdfForwarding',upload.single('file'),async(req,res)=>
{
   console.log("File Name:", req.file.originalname);
   res.status(200).send("Backend post recieved");
})




//Node Backend routes to call Flask APIS
router.post('/merge_pdf', upload.single("file"), async(req,res) =>
{
   try
   {
       if(!req.file||!req.body.course_id)
       {
           return res.status(400).send("Missing Fields");
       }


       const form = new FormData();
       form.append("pdf_file", req.file.buffer, {
           filename: req.file.originalname,
           contentType: req.file.mimetype
       });


       form.append("course_id",req.body.course_id)


       if(req.body.document_id)
       {
           form.append("document_id",req.body.document_id);
       }


       const response = await axios.post("http://localhost:8000/merge_pdf", form,{headers: form.getHeaders(),});


       res.status(response.status).json(response.data);


   }
   catch(err)
   {
       console.error(err);
       res.status(500).json({error:err.message});
   }
 
})


router.delete('/delete_heading',async(req,res)=>
{
   try
   {
       const response = await axios.delete("http://localhost:8000/delete_heading",{data:payload})


       res.status(response.status).json(response.data);
   }
   catch(err)
   {
       console.error(err);
       res.status(500).json({error:err.message});
   }
})


router.post('/create_heading',async(req,res) =>
{
   try
   {
       const{course_id,new_heading,document_id} = req.body;


       if(!course_id||!new_heading)
       {
           return res.status(400).json({error:"Missing Fields"});
       }
       const payload =
       {
           course_id,
           new_heading
       }
       const response = await axios.post("http://localhost:8000/create_heading",payload);


        res.status(response.status).json(response.data);
   }
   catch(err)
   {
       console.error(err);
       res.status(500).json({error:err.message});
   }
})


router.put('/update_heading',async(req,res) =>
{
    try
   {
       const{course_id,old_heading,new_heading,document_id} = req.body;


       if(!course_id||!old_heading||!new_heading)
       {
           return res.status(400).json({error:"Missing Fields"});
       }
       const payload =
       {
           course_id,
           old_heading,
           new_heading
       }
       const response = await axios.put("http://localhost:8000/update_heading",payload);
       res.status(response.status).json(response.data);
   }
   catch(err)
   {
       console.error(err);
       res.status(500).json({error:err.message});
   }
})


router.post('/get_docids',async(req,res) =>
{
   try
   {
       const{course_id} = req.body;
       if(!course_id)
       {
           return res.status(400).json({error:"Missing Fields"});
       }
       const payload =
       {
           course_id
       }


       const response = await axios.post("http://localhost:8000/get_docids",payload);
       res.status(response.status).json(response.data);
   }
   catch(err)
   {
       console.error(err);
       res.status(500).json({error:err.message});
   }
})


router.post('/create_document',async(req,res) =>
{
   try
   {
       const{course_id,document_name} = req.body;
       if(!course_id||!document_name)
       {
           return res.status(400).json({error:"Missing Fields"});
       }
       const payload =
       {
           course_id,
           document_name
       }


       const response = await axios.post("http://localhost:8000/create_document",payload);
       res.status(response.status).json(response.data);
   }
   catch(err)
   {
       console.error(err);
       res.status(500).json({error:err.message});
   }
})
module.exports = router;

