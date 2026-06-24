const express = require('express')
const cors = require('cors')
const multer = require('multer')
const path = require('path')
const fs = require('fs')

const app = express()
const PORT = 5001

app.use(cors())
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ limit: '50mb', extended: true }))
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, 'uploads')
    if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath)
    cb(null, uploadPath)
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`)
  }
})
const upload = multer({ storage })

// Dummy DB for prototype presets
const presets = [
  {
    id: 'neck_1',
    type: 'necklace',
    name: 'Gold Necklace',
    url: 'http://localhost:5001/uploads/default_necklace.jpg'
  },
  {
    id: 'ear_1',
    type: 'earrings',
    name: 'Diamond Studs',
    url: 'http://localhost:5001/uploads/default_earring.png'
  }
]

app.get('/api/jewelry', (req, res) => res.json(presets))

app.post('/api/upload', upload.single('jewelry'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' })
  res.json({ url: `http://localhost:5001/uploads/${req.file.filename}` })
})

app.listen(PORT, () => console.log(`Backend spinning on port ${PORT}`))
