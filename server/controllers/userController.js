
import { generateToken } from "../lib/utils.js";
import User from "../models/user.js";
import bcrypt from 'bcryptjs'
import uploadOnCloudinary from "../lib/cloudinary.js";

const normalizePhone = (value = "") => value.toString().replace(/[^\d+]/g, "").slice(0, 15);

//sign up new user

export const signup = async (req, res) => {
    const { name, email, password, bio, phone } = req.body;
    try {
        if (!name || !email || !password || !bio) {
            return res.status(400).json({ success: false, message: "Missing details" })
        }

        const normalizedPhone = normalizePhone(phone);
        if (phone && normalizedPhone.length < 10) {
            return res.status(400).json({ success: false, message: "Enter a valid mobile number" })
        }

        const user = await User.findOne({ email })
        if (user) {
            return res.status(400).json({ success: false, message: "Already account exist!" })
        }

        if (normalizedPhone) {
            const existingPhoneUser = await User.findOne({ phone: normalizedPhone })
            if (existingPhoneUser) {
                return res.status(400).json({ success: false, message: "Mobile number already linked to another account" })
            }
        }

        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(password, salt)

        const createdUser = await User.create({
            name,
            email,
            password: hashedPassword,
            bio,
            phone: normalizedPhone,
        });

        const newUser = await User.findById(createdUser._id).select("-password");

        const token = generateToken(newUser._id)
        return res.status(200).json({ success: true, userData: newUser, token, message: "account created successfully!" })
    } catch (error) {
        console.log(error);
        return res.status(400).json({ success: false, message: error.message})
    }
}

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const userRecord = await User.findOne({ email })
        const userData = await User.findOne({ email }).select("-password")
        if (!userRecord || !userData) {
            return res.status(400).json({ success: false, message: "User not found!" })
        }
    
        const isPasswordCorrect = await bcrypt.compare(password, userRecord.password);
        if(!isPasswordCorrect){
            return res.status(400).json({success:false, message:"your password incorrect!"})
        }

        const token = generateToken(userData._id)
        return res.status(200).json({ success: true, userData, token, message: "Login successfully!" })
    } catch (error) {
        console.log(error)
        return res.status(500).json({ success: false, message:error.message })
    }
}
//controllerto check  if user is authenticated

export const checkAuth = (req, res) => {
    return res.json({success:true, user:req.user})
}

//controller update user profile details

export const updateProfile = async (req, res) => {
    try {
        const { profilePic, name, bio, phone } = req.body;
        let selectedImage;
        if (req.file) {
            selectedImage = await uploadOnCloudinary(req.file.path);
        } else if (profilePic) {
            selectedImage = await uploadOnCloudinary(profilePic);
        }

        const normalizedPhone = normalizePhone(phone ?? req.user.phone);
        if (phone && normalizedPhone.length < 10) {
            return res.status(400).json({ success: false, message: "Enter a valid mobile number" });
        }

        if (normalizedPhone && normalizedPhone !== (req.user.phone || "")) {
            const existingPhoneUser = await User.findOne({
                phone: normalizedPhone,
                _id: { $ne: req.user._id },
            });

            if (existingPhoneUser) {
                return res.status(400).json({ success: false, message: "Mobile number already linked to another account" });
            }
        }

        const updatePayload = {
            name: name || req.user.name,
            bio: bio || req.user.bio,
            phone: normalizedPhone,
        };

        if (selectedImage) {
            updatePayload.profilePic = selectedImage;
        }

        const user = await User.findByIdAndUpdate(
            req.user._id,
            updatePayload,
            { new: true }
        ).select("-password");
        
        return res.status(200).json({ success: true, updatedUser: user });


    } catch (error) {
        console.log(error);
        return res.status(500).json({ success: false, message: "Error updating profile" });
    }
}
