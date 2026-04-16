import Platform from '../models/Platform.js';

// @desc    Get all platforms
// @route   GET /api/platforms
// @access  Private
const getPlatforms = async (req, res) => {
  try {
    const platforms = await Platform.find({});
    res.json(platforms);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a platform
// @route   POST /api/platforms
// @access  Private/Admin
const createPlatform = async (req, res) => {
  const { name, commission_percentage } = req.body;

  try {
    const platform = await Platform.create({
      name,
      commission_percentage,
    });
    res.status(201).json(platform);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Update a platform
// @route   PUT /api/platforms/:id
// @access  Private/Admin
const updatePlatform = async (req, res) => {
  const { name, commission_percentage } = req.body;

  try {
    const platform = await Platform.findById(req.params.id);

    if (platform) {
      platform.name = name || platform.name;
      platform.commission_percentage = commission_percentage !== undefined ? commission_percentage : platform.commission_percentage;

      const updatedPlatform = await platform.save();
      res.json(updatedPlatform);
    } else {
      res.status(404).json({ message: 'Platform not found' });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete a platform
// @route   DELETE /api/platforms/:id
// @access  Private/Admin
const deletePlatform = async (req, res) => {
  try {
    const platform = await Platform.findById(req.params.id);

    if (platform) {
      await platform.deleteOne();
      res.json({ message: 'Platform removed' });
    } else {
      res.status(404).json({ message: 'Platform not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export { getPlatforms, createPlatform, updatePlatform, deletePlatform };
