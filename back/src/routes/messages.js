const express = require("express");
const jwt = require("jsonwebtoken");
const router = express.Router();
const Message = require("../database/models/message");
const User = require("../database/models/user");
const Like = require("../database/models/like");
const { sequelize } = require("../sequelize");

const BASE_PATH = "/messages";
const EXCLUDE_ATTR = ["password", "email"];
const jwtKey = process.env.JWT_SECRET_KEY;

const includeUserAndLikes = [
  {
    model: User,
    as: "user",
    attributes: { exclude: EXCLUDE_ATTR },
  },
  {
    model: Like,
    as: "likes",
    attributes: ["userId", "createdAt"],
  },
];

router.get(BASE_PATH, async (req, res) => {
  console.log(req.query);
  try {
    const messages = await Message.findAll({
      attributes: [
        "id",
        "title",
        "body",
        "createdAt",
        "updatedAt",
        "userId",
        [sequelize.fn("COUNT", sequelize.col("likes.messageId")), "like_count"],
      ],
      include: includeUserAndLikes,
      group: ["id", "likes.userId", "likes.createdAt", "likes.id"],
      order: [
        ["createdAt", "DESC"],
        ["updatedAt", "DESC"],
      ],
      where: req?.query || {},
    });

    res.status(200).send(messages);
  } catch (error) {
    res.status(500).send("Unable to retrieve messages");
  }
});

router.get(`${BASE_PATH}/likedMessages`, async (req, res) => {
  try {
    const token = req.headers["authorization"]?.replace("Bearer ", "");
    await jwt.verify(token, jwtKey);
    const user = jwt.decode(token)?.id;

    const likedMessages = await Message.findAll({
      attributes: [
        "id",
        "title",
        "body",
        "createdAt",
        "updatedAt",
        "userId",
        [sequelize.fn("COUNT", sequelize.col("likes.messageId")), "like_count"],
      ],
      include: [
        {
          model: User,
          as: "user",
          attributes: { exclude: EXCLUDE_ATTR },
        },
        {
          model: Like,
          as: "likes",
          attributes: ["messageId", "userId"],
          where: { userId: req?.query?.userId },
          required: true,
        },
      ],
      group: ["id", "likes.userId"],
      order: [
        ["createdAt", "DESC"],
        ["updatedAt", "DESC"],
      ],
    });

    res.status(200).send(likedMessages);
  } catch (error) {
    res.status(500).send("Unable to retrieve messages");
  }
});

router.post(BASE_PATH, async (req, res) => {
  try {
    const newMessage = await Message.create(req.body);

    const message = await Message.findByPk(newMessage?.id, {
      include: includeUserAndLikes,
    });

    res.status(201).send(message);
  } catch (error) {
    res.status(500).send(`Unable to create message`);
  }
});

router.put(`${BASE_PATH}/:id`, async (req, res) => {
  try {
    await Message.update(req.body, {
      where: {
        id: req.params.id,
      },
    });

    const message = await Message.findByPk(req?.params?.id, {
      include: includeUserAndLikes,
    });

    res.status(200).send(message);
  } catch (error) {
    res.status(500).send(`Unable to update message`);
  }
});

router.delete(`${BASE_PATH}/:id`, async (req, res) => {
  try {
    await Message.destroy({
      where: {
        id: req.params.id,
      },
    });

    res.status(200).send("Successfully deleted message");
  } catch (error) {
    res.status(500).send("Unable to delete message");
  }
});

router.post(`${BASE_PATH}/like/:id`, async (req, res) => {
  try {
    const token = req.headers["authorization"]?.replace("Bearer ", "");
    await jwt.verify(token, jwtKey);
    const decodedToken = jwt.decode(token);

    const likeExists = await Like.findOne({
      where: { userId: decodedToken?.id, messageId: req.params.id },
    });

    const ret = { messageId: req.params.id, userId: decodedToken.id };

    if (likeExists) {
      await likeExists.destroy();
      ret.status = "unlike";
    } else {
      await Like.create({ userId: decodedToken?.id, messageId: req.params.id });
      ret.status = "like";
    }

    res.status(200).send(ret);
  } catch (error) {
    res.status(500).send("Unable to like message at this point!");
  }
});

module.exports = router;
