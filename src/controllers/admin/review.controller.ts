import { Request, Response } from "express";
import Note from "../../models/users/Note";

export const approveNote = async (req: Request, res: Response) => {
  const { id } = req.params;

  const note = await Note.findByIdAndUpdate(
    id,
    { status: "approved" },
    { new: true }
  );

  res.json(note);
};
