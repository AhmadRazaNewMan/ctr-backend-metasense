//Supabase
const supabase = require("../config/supabase");

/**
 * @description Accept Invite
 * @route GET /api/invite/accept-invite
 * @access Public
 */
module.exports.acceptInvite = async (req, res) => {
  const { owner, owner_email, invite_user } = req.query;

  try {
    //Change Status In Supabse
    const { error } = await supabase
      .from("usermanagement")
      .update({ is_accepted: true })
      .eq("owner", owner)
      .eq("owner_email", owner_email)
      .eq("invite_user", invite_user);

    if (error) {
      return res.status(404).json({ error: error.message });
    }

    //Response
    return res.redirect("http://localhost:3000");
  } catch (error) {
    console.log(error);
    return res.status(500).json({ errors: error });
  }
};
