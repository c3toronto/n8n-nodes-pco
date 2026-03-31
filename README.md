# @c3toronto/n8n-nodes-pco

![n8n.io - Workflow Automation](https://raw.githubusercontent.com/n8n-io/n8n/master/assets/n8n-logo.png)

This is an n8n community node that lets you use [Planning Center Online](https://www.planningcenteronline.com/) in your n8n workflows.

It includes two nodes:
- **Planning Center People** - Full access to the People API (contacts, lists, forms, workflows, and more)
- **PCO Workflow Actions** - Perform actions on workflow cards (skip, promote, go back, skip to step)

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

## Table of Contents

- [Installation](#installation)
- [Prerequisites](#prerequisites)
- [Operations](#operations)
- [Credentials](#credentials)
- [Compatibility](#compatibility)
- [Usage](#usage)
- [Development](#development)
- [Resources](#resources)
- [License](#license)

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

### Community Node Installation

1. Go to **Settings > Community Nodes** in your n8n instance
2. Click **Install**
3. Enter `@c3toronto/n8n-nodes-pco` in the npm Package Name field
4. Agree to the risks and click **Install**

After installation, the Planning Center People node will appear in your nodes panel.

### Manual Installation (Self-Hosted)

```bash
cd ~/.n8n
npm install @c3toronto/n8n-nodes-pco
```

Then restart your n8n instance.

## Prerequisites

You need the following:

1. [n8n](https://n8n.io/) installation (self-hosted or cloud)
2. A [Planning Center Online](https://www.planningcenteronline.com/) account
3. Planning Center API credentials (Personal Access Token)

## Operations

### Planning Center People

Full access to the **Planning Center People API v2**, including operations for:

- **People** - Manage person records and profiles
- **Lists** - Create and manage dynamic lists of people
- **Forms** - Access form submissions and responses
- **Households** - Manage household relationships
- **Campuses** - Access campus information
- **Field Definitions** - Work with custom fields
- **Notes** - Add and retrieve notes on person profiles
- **Addresses** - Manage contact addresses
- **Phone Numbers** - Manage contact phone numbers
- **Emails** - Manage contact email addresses
- **Workflows** - Access workflow data
- **Messages** - View message history
- **And many more...**

Each operation supports filtering, pagination, and additional parameters through the "Additional Fields" option.

### PCO Workflow Actions

Perform actions on workflow cards for a given person:

- **Skip Step** - Skip the current step on a workflow card
- **Promote** - Complete the current step and advance the card
- **Go Back** - Move a workflow card back one step
- **Skip to Step** - Skip forward repeatedly until reaching a target step (with configurable max skips safety limit)

All operations require a **Person ID** and **Workflow Card ID**. The node handles PCO rate limiting automatically with retry logic.

## Credentials

To connect to Planning Center Online, you'll need to create a Personal Access Token:

1. Log in to your Planning Center account
2. Go to your [Personal Access Tokens page](https://api.planningcenteronline.com/oauth/applications)
3. Click **New Personal Access Token**
4. Give it a name (e.g., "n8n Integration")
5. Copy the **Application ID** and **Secret**

In n8n, create a new "People API" credential with:
- **URL**: `https://api.planningcenteronline.com/people/v2` (default)
- **Client ID**: Your Application ID
- **Client Secret**: Your Secret

## Compatibility

- **Tested with n8n version**: 1.120.4+
- **Planning Center People API**: v2
- **Node version**: 18.10 or higher

## Usage

### Example 1: Get All People

1. Add the **Planning Center People** node
2. Select **Resource**: Person
3. Select **Operation**: GET /people
4. Configure any filters in **Additional Fields** (optional)
5. Execute the workflow

### Example 2: Get Form Submissions

1. Add the **Planning Center People** node
2. Select **Resource**: Form
3. Select **Operation**: GET /forms/{form_id}/form_submissions
4. Enter the **Form Id**
5. Add filters in **Additional Fields** if needed (e.g., date ranges)
6. Execute the workflow

### Example 3: Update a Person's Information

1. Add the **Planning Center People** node
2. Select **Resource**: Person
3. Select **Operation**: PATCH /people/{person_id}
4. Enter the **Person Id**
5. Configure the fields to update in **Additional Fields**
6. Execute the workflow

### Example 4: Skip a Workflow Card to a Specific Step

1. Add the **PCO Workflow Actions** node
2. Select **Operation**: Skip to Step
3. Enter the **Person ID** and **Workflow Card ID**
4. Enter the **Target Step ID** to skip to
5. Optionally adjust **Max Skips** (default: 10)
6. Execute the workflow

### Tips

- **Required fields** appear at the top level (e.g., `form_id`, `person_id`)
- **Optional fields** are grouped under "Additional Fields" to keep the interface clean
- Use the **filter** and **where** parameters to narrow down results
- Check the [Planning Center API Documentation](https://developer.planning.center/docs/#/overview) for field details

## Development

### Setup

```bash
# Clone the repository
git clone https://github.com/c3toronto/n8n-nodes-pco.git
cd n8n-nodes-pco

# Install dependencies
npm install

# Build the project
npm run build
```

### Local Testing

```bash
# Link the package locally
npm link

# In your n8n installation directory
cd ~/.n8n/custom
npm link @c3toronto/n8n-nodes-pco

# Start n8n
n8n start
```

### Development Commands

```bash
# Build
npm run build

# Watch mode (rebuild on changes)
npm run dev

# Run tests
npm run test

# Lint
npm run lint

# Format code
npm run format
```

### Project Structure

```
n8n-nodes-pco/
├── credentials/
│   └── peopleApi.credentials.ts        # API authentication
├── nodes/
│   └── pco/
│       ├── people.node.ts              # People API node (OpenAPI-generated)
│       ├── people.node.json            # People node metadata
│       ├── pcoWorkflowActions.node.ts  # Workflow Actions node (hand-written)
│       ├── pcoWorkflowActions.node.json# Workflow Actions metadata
│       ├── openapi_people.json         # OpenAPI specification
│       ├── logo.png                    # Node icon
│       └── logo.svg                    # Node icon (SVG)
└── dist/                               # Compiled output
```

## Resources

- [n8n community nodes documentation](https://docs.n8n.io/integrations/community-nodes/)
- [Planning Center API Documentation](https://developer.planning.center/docs/)
- [Planning Center People API Reference](https://developer.planning.center/docs/#/apps/people)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Version History

See [CHANGELOG.md](CHANGELOG.md) for details.

## License

[MIT](LICENSE.md)

## Credits

This node was built using [@devlikeapro/n8n-openapi-node](https://github.com/devlikeapro/n8n-openapi-node), which generates n8n nodes from OpenAPI specifications.

Built with ❤️ by [C3 Toronto](https://github.com/c3toronto)

---

**Note**: This is a community-maintained package and is not officially associated with Planning Center or n8n.io.
