import fs from 'fs'
import imagekit from '../configs/imagekit';
import Story from '../models/Story';
import User from '../models/User';
import { inngest } from '../inngest';


export const addUserStory = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { content, media_type , background_color} = req.body;
    const media = req.file;

    let media_url = ''

    if(media_type === 'image' || media_type === 'video'){
        const fileBuffer = fs.readFileSync(media.path)
        const response = await imagekit.upload({
            file: fileBuffer,
            fileName: media.originalname,
        })
        media_url = response.url
    }
    const story = await Story.create({
        user: userId,
        content,
        media_url,
        media_type,
        background_color,
    })

    await inngest.send({
        name: 'app/story.delete',
        data: {storyId: story._id}
    })

    res.json({succes: true})

  } catch (error) {
    console.log(error)
    res.json({succes: false, message: error.message})
  }
};

export const getStories = async (req, res) => {
    try {
    const { userId } = req.auth();
    const user = await User.findById(userId)
    
    const userIds = [userId, ...user.connections, ...user.following]
    const strories = await Story.find({user: {$in: userIds}}).populate('user').sort
    ({createdAt: -1});
     
    res.json({succes: true, strories})
  } catch (error) {
    console.log(error)
    res.json({succes: false, message: error.message})
  }
}