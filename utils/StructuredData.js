//Utils
const { openai } = require("./OpenAI");

module.exports.translatePrompt = async (prompt, languageCode) => {
  try {
    const translation = await openai(
      `Translate the following ${prompt} into ${languageCode} language code.
         Your response should only be like the following. If the response is different, we won't be able to understand.
         Original, Translated, Original, Translated
         
         Meaning english word then comma and translate
         `
    );
    return translation;
  } catch (error) {
    console.error("Translation Error:", error);
    throw new Error("Translation Failed");
  }
};

/**
 * Final Prompts
 */

module.exports.generateFinalPromptForScopesInfo = (basePrompt, year) => {
  const finalPrompt = `
    Your job is to understand the context data I give and extract the values required out of it. This data is from a company's annual report filing. I will provide you with the data we need to export and for the year. You have to first understand the context data and then extract the required values out of it. These values are expected in their general unit, so if any calculation needs to be done, do it on your end. 
    First we need to extract Scope 1, Scope 2 (market-based) and Scope 3 values for the year ${year}. 
    
    Your output to this chat should only and only be a JSON object with the key as scope_1, scope_2_market_based and scope_3 and the value which you have calculated. For example:
    GPT output would look like: 
    {
        "scope_1": "numeric value", 
        "scope_2_market_based": "numeric value", 
        "scope_3": "numeric value"
    }

    You also need to handle different types of units. Your response would always be the numeric value with no units added and we would assume these are base units for example: If the value is in tons, we would assume GPT as give us metric tons value. If in the context data the value is in Ktons, convert it to metric tons by using appropriate calculations (e.g., multiply ktons by 1000 to convert to metric tons) and return us the value. If the unit is not provided, assume it’s base unit. 
    If a value simple does not exist for  in the context data for Scope 1, Scope 2 (market-based) and Scope 3 for the year ${year}, return it with "-".   
  
    Your response must only contain the JSON object only, we don't need any other text, only JSON with calculated values.

    Example:    
    {
        "scope_1": "calculated metric tons value", 
        "scope_2_market_based": "calculated metric tons value", 
        "scope_3": "calculated metric tons value"
    }

    Provide only the JSON response. Keeping these instructions in mind, now start understanding the context data given below:
    
      
    Context data: ${basePrompt}.`;
  const column = { scope_1: "-", scope_2_market_based: "-", scope_3: "-" };

  return { finalPrompt, column };
};

module.exports.generateFinalPromptForTOTScope1 = (basePrompt, year) => {
  const finalPrompt = `
  Your job is to understand the context data I give and extract the values required out of it. This data is from a company's annual report filing. I will provide you with the data we need to export and for the year. You have to first understand the context data and then extract the required values out of it. These values are expected in their general unit, so if any calculation needs to be done, do it on your end.
  First we need to extract Total Scope 1 (TOT Scope 1) values for the year ${year}. 
  
  Your output to this chat should only and only be a JSON object with the key as tot_scope_1 and the value which you have calculated. For example:
  GPT output would look like: 
  {
      "tot_scope_1": "numeric value"
  }

  If a value simply does not exist in the context data for Scope 1 for the year ${year}, return it with "-".

  Your response must only contain the JSON object only, we don't need any other text, only JSON with calculated values.

  Example:    
  {
      "tot_scope_1": "calculated value"
  }

  Provide only the JSON response. Keeping these instructions in mind, now start understanding the context data given below:
    
  Context data: ${basePrompt}.`;
  const column = { scope_1_total: "-" };

  return { finalPrompt, column };
};

module.exports.generateFinalPromptForFuelForServiceVehicle = (
  basePrompt,
  year
) => {
  const finalPrompt = `  
  Your job is to understand the context data I give and extract the values required out of it. This data is from a company's annual report filing. I will provide you with the data we need to export and for the year. You have to first understand the context data and then extract the required values out of it. These values are expected in their general unit, so if any calculation needs to be done, do it on your end.
  First we need to extract the values for fuel used by the service vehicle fleet for the year ${year}. 
  
  Your output to this chat should only and only be a JSON object with the key as fuel_service_vehicle_fleet and the value which you have calculated. For example:
  GPT output would look like: 
  {
      "fuel_service_vehicle_fleet": "numeric value"
  }

  If a value simply does not exist in the context data for fuel used by the service vehicle fleet for the year ${year}, return it with "-".

  Your response must only contain the JSON object only, we don't need any other text, only JSON with calculated values.

  Example:    
  {
      "fuel_service_vehicle_fleet": "calculated value"
  }

  Provide only the JSON response. Keeping these instructions in mind, now start understanding the context data given below:
    
  Context data: ${basePrompt}.`;
  const column = { scope_1_company_vehicles: "-" };

  return { finalPrompt, column };
};

module.exports.generateFinalPromptForFacilityStationary = (
  basePrompt,
  year
) => {
  const finalPrompt = `
  Your job is to understand the context data I give and extract the values required out of it. This data is from a company's annual report filing. I will provide you with the data we need to export and for the year. You have to first understand the context data and then extract the required values out of it. These values are expected in their general unit, so if any calculation needs to be done, do it on your end.
  First we need to extract the values for facility stationary combustion and refrigerants for the year ${year}. 
  
  Your output to this chat should only and only be a JSON object with the key as facility_stationary_combustion_and_refrigerants and the value which you have calculated. For example:
  GPT output would look like: 
  {
      "facility_stationary_combustion_and_refrigerants": "numeric value"
  }

  If a value simply does not exist in the context data for facility stationary combustion and refrigerants for the year ${year}, return it with "-".

  Your response must only contain the JSON object only, we don't need any other text, only JSON with calculated values.

  Example:    
  {
      "facility_stationary_combustion_and_refrigerants": "calculated value"
  }

  Provide only the JSON response. Keeping these instructions in mind, now start understanding the context data given below:
    
  Context data: ${basePrompt}.`;
  const column = { scope_1_company_facilities: "-" };

  return { finalPrompt, column };
};

module.exports.generateFinalPromptForTOTScope2 = (basePrompt, year) => {
  const finalPrompt = `
  Your job is to understand the context data I give and extract the values required out of it. This data is from a company's annual report filing. I will provide you with the data we need to export and for the year. You have to first understand the context data and then extract the required values out of it. These values are expected in their general unit, so if any calculation needs to be done, do it on your end.
  First we need to extract Total Scope 2 Market Based (TOT Scope 2 market-based) values for the year ${year}. 
  
  Your output to this chat should only and only be a JSON object with the key as tot_scope_2 and the value which you have calculated. For example:
  GPT output would look like: 
  {
      "tot_scope_2": "numeric value"
  }

  If a value simply does not exist in the context data for Scope 1 for the year ${year}, return it with "-".

  Your response must only contain the JSON object only, we don't need any other text, only JSON with calculated values.

  Example:    
  {
      "tot_scope_2": "calculated value"
  }

  Provide only the JSON response. Keeping these instructions in mind, now start understanding the context data given below:
    
  Context data: ${basePrompt}.`;
  const column = { scope_2_total: "-" };

  return { finalPrompt, column };
};

module.exports.generateFinalPromptForPurchaseEnergyLocation = (
  basePrompt,
  year
) => {
  const finalPrompt = `
  Your job is to understand the context data I give and extract the values required out of it. This data is from a company's annual report filing. I will provide you with the data we need to export and for the year. You have to first understand the context data and then extract the required values out of it. These values are expected in their general unit, so if any calculation needs to be done, do it on your end.
  First we need to extract the values for purchased energy (location-based) for the year ${year}. 
  
  Your output to this chat should only and only be a JSON object with the key as purchased_energy_location_based and the value which you have calculated. For example:
  GPT output would look like: 
  {
      "purchased_energy_location_based": "numeric value"
  }

  If a value simply does not exist in the context data for purchased energy (location-based) for the year ${year}, return it with "-".

  Your response must only contain the JSON object only, we don't need any other text, only JSON with calculated values.

  Example:    
  {
      "purchased_energy_location_based": "calculated value"
  }

  Provide only the JSON response. Keeping these instructions in mind, now start understanding the context data given below:
    
  Context data: ${basePrompt}.`;
  const column = { scope_2_purchased_energy_location_based: "-" };

  return { finalPrompt, column };
};

module.exports.generateFinalPromptForPurchaseEnergyMarket = (
  basePrompt,
  year
) => {
  const finalPrompt = `
    Your job is to understand the context data I give and extract the values required out of it. This data is from a company's annual report filing. I will provide you with the data we need to export and for the year. You have to first understand the context data and then extract the required values out of it. These values are expected in their general unit, so if any calculation needs to be done, do it on your end.
    First we need to extract the values for purchased energy (market-based) for the year ${year}. 
    
    Your output to this chat should only and only be a JSON object with the key as purchased_energy_market_based and the value which you have calculated. For example:
    GPT output would look like: 
    {
        "purchased_energy_market_based": "numeric value"
    }

    If a value simply does not exist in the context data for purchased energy (market-based) for the year ${year}, return it with "-".

    Your response must only contain the JSON object only, we don't need any other text, only JSON with calculated values.

    Example:    
    {
        "purchased_energy_market_based": "calculated value"
    }

    Provide only the JSON response. Keeping these instructions in mind, now start understanding the context data given below:
      
    Context data: ${basePrompt}.`;
  const column = { scope_2_purchased_energy_market_based: "-" };

  return { finalPrompt, column };
};

module.exports.generateFinalPromptForTOTScope3 = (basePrompt, year) => {
  const finalPrompt = `
  Your job is to understand the context data I give and extract the values required out of it. This data is from a company's annual report filing. I will provide you with the data we need to export and for the year. You have to first understand the context data and then extract the required values out of it. These values are expected in their general unit, so if any calculation needs to be done, do it on your end.
  First we need to extract Total Scope 3 (TOT Scope 3) values for the year ${year}. 
  
  Your output to this chat should only and only be a JSON object with the key as tot_scope_3 and the value which you have calculated. For example:
  GPT output would look like: 
  {
      "tot_scope_3": "numeric value"
  }

  If a value simply does not exist in the context data for Scope 1 for the year ${year}, return it with "-".

  Your response must only contain the JSON object only, we don't need any other text, only JSON with calculated values.

  Example:    
  {
      "tot_scope_3": "calculated value"
  }

  Provide only the JSON response. Keeping these instructions in mind, now start understanding the context data given below:
    
  Context data: ${basePrompt}.`;
  const column = { scope_3_total: "-" };

  return { finalPrompt, column };
};

module.exports.generateFinalPromptForUpstreamPurchasedGoodsAndServices = (
  basePrompt,
  year
) => {
  const finalPrompt = `
    Your job is to understand the context data I give and extract the values required out of it. This data is from a company's annual report filing. I will provide you with the data we need to export and for the year. You have to first understand the context data and then extract the required values out of it. These values are expected in their general unit, so if any calculation needs to be done, do it on your end.
    First we need to extract the values for UPSTREAM Purchased goods and services for the year ${year}. 
    
    Your output to this chat should only and only be a JSON object with the key as upstream_purchased_goods_and_services and the value which you have calculated. For example:
    GPT output would look like: 
    {
        "upstream_purchased_goods_and_services": "numeric value"
    }

    If a value simply does not exist in the context data for UPSTREAM Purchased goods and services for the year ${year}, return it with "-".

    Your response must only contain the JSON object only, we don't need any other text, only JSON with calculated values.

    Example:    
    {
        "upstream_purchased_goods_and_services": "calculated value"
    }

    Provide only the JSON response. Keeping these instructions in mind, now start understanding the context data given below:
      
    Context data: ${basePrompt}.`;
  const column = { scope_3_1_purchased_goods_and_services: "-" };

  return { finalPrompt, column };
};

module.exports.generateFinalPromptForCapitalGoods = (basePrompt, year) => {
  const finalPrompt = `
    Your job is to understand the context data I give and extract the values required out of it. This data is from a company's annual report filing. I will provide you with the data we need to export and for the year. You have to first understand the context data and then extract the required values out of it. These values are expected in their general unit, so if any calculation needs to be done, do it on your end.
    First we need to extract the values for Capital goods for the year ${year}. 
    
    Your output to this chat should only and only be a JSON object with the key as capital_goods and the value which you have calculated. For example:
    GPT output would look like: 
    {
        "capital_goods": "numeric value"
    }

    If a value simply does not exist in the context data for Capital goods for the year ${year}, return it with "-".

    Your response must only contain the JSON object only, we don't need any other text, only JSON with calculated values.

    Example:    
    {
        "capital_goods": "calculated value"
    }

    Provide only the JSON response. Keeping these instructions in mind, now start understanding the context data given below:
      
    Context data: ${basePrompt}.`;
  const column = { scope_3_2_capital_goods: "-" };

  return { finalPrompt, column };
};

module.exports.generateFinalPromptForFuelAndEnergyRelatedActivities = (
  basePrompt,
  year
) => {
  const finalPrompt = `
    Your job is to understand the context data I give and extract the values required out of it. This data is from a company's annual report filing. I will provide you with the data we need to export and for the year. You have to first understand the context data and then extract the required values out of it. These values are expected in their general unit, so if any calculation needs to be done, do it on your end.
    First we need to extract the values for Fuel- and energy-related activities for the year ${year}. 
    
    Your output to this chat should only and only be a JSON object with the key as fuel_and_energy_related_activities and the value which you have calculated. For example:
    GPT output would look like: 
    {
        "fuel_and_energy_related_activities": "numeric value"
    }

    If a value simply does not exist in the context data for Fuel- and energy-related activities for the year ${year}, return it with "-".

    Your response must only contain the JSON object only, we don't need any other text, only JSON with calculated values.

    Example:    
    {
        "fuel_and_energy_related_activities": "calculated value"
    }

    Provide only the JSON response. Keeping these instructions in mind, now start understanding the context data given below:
      
    Context data: ${basePrompt}.`;
  const column = { scope_3_3_fuel_and_energy_related_activities: "-" };

  return { finalPrompt, column };
};

module.exports.generateFinalPromptForUpstreamTransportationAndDistribution = (
  basePrompt,
  year
) => {
  const finalPrompt = `
    Your job is to understand the context data I give and extract the values required out of it. This data is from a company's annual report filing. I will provide you with the data we need to export and for the year. You have to first understand the context data and then extract the required values out of it. These values are expected in their general unit, so if any calculation needs to be done, do it on your end.
    First we need to extract the values for Upstream transportation and distribution for the year ${year}. 
    
    Your output to this chat should only and only be a JSON object with the key as upstream_transportation_and_distribution and the value which you have calculated. For example:
    GPT output would look like: 
    {
        "upstream_transportation_and_distribution": "numeric value"
    }

    If a value simply does not exist in the context data for Upstream transportation and distribution for the year ${year}, return it with "-".

    Your response must only contain the JSON object only, we don't need any other text, only JSON with calculated values.

    Example:    
    {
        "upstream_transportation_and_distribution": "calculated value"
    }

    Provide only the JSON response. Keeping these instructions in mind, now start understanding the context data given below:
      
    Context data: ${basePrompt}.`;
  const column = { scope_3_4_upstream_transportation_and_distribution: "-" };

  return { finalPrompt, column };
};

module.exports.generateFinalPromptForWasteGeneratedInOperations = (
  basePrompt,
  year
) => {
  const finalPrompt = `
    Your job is to understand the context data I give and extract the values required out of it. This data is from a company's annual report filing. I will provide you with the data we need to export and for the year. You have to first understand the context data and then extract the required values out of it. These values are expected in their general unit, so if any calculation needs to be done, do it on your end.
    First we need to extract the values for Waste generated in operations for the year ${year}. 
    
    Your output to this chat should only and only be a JSON object with the key as waste_generated_in_operations and the value which you have calculated. For example:
    GPT output would look like: 
    {
        "waste_generated_in_operations": "numeric value"
    }

    If a value simply does not exist in the context data for Waste generated in operations for the year ${year}, return it with "-".

    Your response must only contain the JSON object only, we don't need any other text, only JSON with calculated values.

    Example:    
    {
        "waste_generated_in_operations": "calculated value"
    }

    Provide only the JSON response. Keeping these instructions in mind, now start understanding the context data given below:
      
    Context data: ${basePrompt}.`;
  const column = { scope_3_5_waste_generated_in_operations: "-" };

  return { finalPrompt, column };
};

module.exports.generateFinalPromptForBusinessTravel = (basePrompt, year) => {
  const finalPrompt = `
    Your job is to understand the context data I give and extract the values required out of it. This data is from a company's annual report filing. I will provide you with the data we need to export and for the year. You have to first understand the context data and then extract the required values out of it. These values are expected in their general unit, so if any calculation needs to be done, do it on your end.
    First we need to extract the values for Business travel for the year ${year}. 
    
    Your output to this chat should only and only be a JSON object with the key as business_travel and the value which you have calculated. For example:
    GPT output would look like: 
    {
        "business_travel": "numeric value"
    }

    If a value simply does not exist in the context data for Business travel for the year ${year}, return it with "-".

    Your response must only contain the JSON object only, we don't need any other text, only JSON with calculated values.

    Example:    
    {
        "business_travel": "calculated value"
    }

    Provide only the JSON response. Keeping these instructions in mind, now start understanding the context data given below:
      
    Context data: ${basePrompt}.`;
  const column = { scope_3_6_business_travel: "-" };

  return { finalPrompt, column };
};

module.exports.generateFinalPromptForEmployeeCommuting = (basePrompt, year) => {
  const finalPrompt = `
    Your job is to understand the context data I give and extract the values required out of it. This data is from a company's annual report filing. I will provide you with the data we need to export and for the year. You have to first understand the context data and then extract the required values out of it. These values are expected in their general unit, so if any calculation needs to be done, do it on your end.
    First we need to extract the values for Employee commuting for the year ${year}. 
    
    Your output to this chat should only and only be a JSON object with the key as employee_commuting and the value which you have calculated. For example:
    GPT output would look like: 
    {
        "employee_commuting": "numeric value"
    }

    If a value simply does not exist in the context data for Employee commuting for the year ${year}, return it with "-".

    Your response must only contain the JSON object only, we don't need any other text, only JSON with calculated values.

    Example:    
    {
        "employee_commuting": "calculated value"
    }

    Provide only the JSON response. Keeping these instructions in mind, now start understanding the context data given below:
      
    Context data: ${basePrompt}.`;
  const column = { scope_3_7_employee_commuting: "-" };

  return { finalPrompt, column };
};

module.exports.generateFinalPromptForUpstreamLeasedAssets = (
  basePrompt,
  year
) => {
  const finalPrompt = `
    Your job is to understand the context data I give and extract the values required out of it. This data is from a company's annual report filing. I will provide you with the data we need to export and for the year. You have to first understand the context data and then extract the required values out of it. These values are expected in their general unit, so if any calculation needs to be done, do it on your end.
    First we need to extract the values for Upstream leased assets for the year ${year}. 
    
    Your output to this chat should only and only be a JSON object with the key as upstream_leased_assets and the value which you have calculated. For example:
    GPT output would look like: 
    {
        "upstream_leased_assets": "numeric value"
    }

    If a value simply does not exist in the context data for Upstream leased assets for the year ${year}, return it with "-".

    Your response must only contain the JSON object only, we don't need any other text, only JSON with calculated values.

    Example:    
    {
        "upstream_leased_assets": "calculated value"
    }

    Provide only the JSON response. Keeping these instructions in mind, now start understanding the context data given below:
      
    Context data: ${basePrompt}.`;
  const column = { scope_3_8_upstream_leased_assets: "-" };

  return { finalPrompt, column };
};

module.exports.generateFinalPromptForDownstreamTransportationAndDistribution = (
  basePrompt,
  year
) => {
  const finalPrompt = `
    Your job is to understand the context data I give and extract the values required out of it. This data is from a company's annual report filing. I will provide you with the data we need to export and for the year. You have to first understand the context data and then extract the required values out of it. These values are expected in their general unit, so if any calculation needs to be done, do it on your end.
    First we need to extract the values for Downstream transportation and distribution for the year ${year}. 
    
    Your output to this chat should only and only be a JSON object with the key as downstream_transportation_and_distribution and the value which you have calculated. For example:
    GPT output would look like: 
    {
        "downstream_transportation_and_distribution": "numeric value"
    }

    If a value simply does not exist in the context data for Downstream transportation and distribution for the year ${year}, return it with "-".

    Your response must only contain the JSON object only, we don't need any other text, only JSON with calculated values.

    Example:    
    {
        "downstream_transportation_and_distribution": "calculated value"
    }

    Provide only the JSON response. Keeping these instructions in mind, now start understanding the context data given below:
      
    Context data: ${basePrompt}.`;
  const column = { scope_3_9_downstream_transportation_and_distribution: "-" };

  return { finalPrompt, column };
};

module.exports.generateFinalPromptForProcessingOfSoldProducts = (
  basePrompt,
  year
) => {
  const finalPrompt = `
    Your job is to understand the context data I give and extract the values required out of it. This data is from a company's annual report filing. I will provide you with the data we need to export and for the year. You have to first understand the context data and then extract the required values out of it. These values are expected in their general unit, so if any calculation needs to be done, do it on your end.
    First we need to extract the values for Processing of sold products for the year ${year}. 
    
    Your output to this chat should only and only be a JSON object with the key as processing_of_sold_products and the value which you have calculated. For example:
    GPT output would look like: 
    {
        "processing_of_sold_products": "numeric value"
    }

    If a value simply does not exist in the context data for Processing of sold products for the year ${year}, return it with "-".

    Your response must only contain the JSON object only, we don't need any other text, only JSON with calculated values.

    Example:    
    {
        "processing_of_sold_products": "calculated value"
    }

    Provide only the JSON response. Keeping these instructions in mind, now start understanding the context data given below:
      
    Context data: ${basePrompt}.`;
  const column = { scope_3_10_processing_of_sold_products: "-" };

  return { finalPrompt, column };
};

module.exports.generateFinalPromptForUseOfSoldProducts = (basePrompt, year) => {
  const finalPrompt = `
    Your job is to understand the context data I give and extract the values required out of it. This data is from a company's annual report filing. I will provide you with the data we need to export and for the year. You have to first understand the context data and then extract the required values out of it. These values are expected in their general unit, so if any calculation needs to be done, do it on your end.
    First we need to extract the values for Use of sold products for the year ${year}. 
    
    Your output to this chat should only and only be a JSON object with the key as use_of_sold_products and the value which you have calculated. For example:
    GPT output would look like: 
    {
        "use_of_sold_products": "numeric value"
    }

    If a value simply does not exist in the context data for Use of sold products for the year ${year}, return it with "-".

    Your response must only contain the JSON object only, we don't need any other text, only JSON with calculated values.

    Example:    
    {
        "use_of_sold_products": "calculated value"
    }

    Provide only the JSON response. Keeping these instructions in mind, now start understanding the context data given below:
      
    Context data: ${basePrompt}.`;
  const column = { scope_3_11_use_of_sold_products: "-" };

  return { finalPrompt, column };
};

module.exports.generateFinalPromptForEndOfLifeTreatmentOfSoldProducts = (
  basePrompt,
  year
) => {
  const finalPrompt = `
    Your job is to understand the context data I give and extract the values required out of it. This data is from a company's annual report filing. I will provide you with the data we need to export and for the year. You have to first understand the context data and then extract the required values out of it. These values are expected in their general unit, so if any calculation needs to be done, do it on your end.
    First we need to extract the values for End-of-life treatment of sold products for the year ${year}. 
    
    Your output to this chat should only and only be a JSON object with the key as end_of_life_treatment_of_sold_products and the value which you have calculated. For example:
    GPT output would look like: 
    {
        "end_of_life_treatment_of_sold_products": "numeric value"
    }

    If a value simply does not exist in the context data for End-of-life treatment of sold products for the year ${year}, return it with "-".

    Your response must only contain the JSON object only, we don't need any other text, only JSON with calculated values.

    Example:    
    {
        "end_of_life_treatment_of_sold_products": "calculated value"
    }

    Provide only the JSON response. Keeping these instructions in mind, now start understanding the context data given below:
      
    Context data: ${basePrompt}.`;
  const column = { scope_3_12_end_of_life_treatment_of_sold_products: "-" };

  return { finalPrompt, column };
};

module.exports.generateFinalPromptForDownstreamLeasedAssets = (
  basePrompt,
  year
) => {
  const finalPrompt = `
    Your job is to understand the context data I give and extract the values required out of it. This data is from a company's annual report filing. I will provide you with the data we need to export and for the year. You have to first understand the context data and then extract the required values out of it. These values are expected in their general unit, so if any calculation needs to be done, do it on your end.
    First we need to extract the values for Downstream leased assets for the year ${year}. 
    
    Your output to this chat should only and only be a JSON object with the key as downstream_leased_assets and the value which you have calculated. For example:
    GPT output would look like: 
    {
        "downstream_leased_assets": "numeric value"
    }

    If a value simply does not exist in the context data for Downstream leased assets for the year ${year}, return it with "-".

    Your response must only contain the JSON object only, we don't need any other text, only JSON with calculated values.

    Example:    
    {
        "downstream_leased_assets": "calculated value"
    }

    Provide only the JSON response. Keeping these instructions in mind, now start understanding the context data given below:
      
    Context data: ${basePrompt}.`;
  const column = { scope_3_13_downstream_leased_assets: "-" };

  return { finalPrompt, column };
};

module.exports.generateFinalPromptForFranchises = (basePrompt, year) => {
  const finalPrompt = `
    Your job is to understand the context data I give and extract the values required out of it. This data is from a company's annual report filing. I will provide you with the data we need to export and for the year. You have to first understand the context data and then extract the required values out of it. These values are expected in their general unit, so if any calculation needs to be done, do it on your end.
    First we need to extract the values for Franchises for the year ${year}. 
    
    Your output to this chat should only and only be a JSON object with the key as franchises and the value which you have calculated. For example:
    GPT output would look like: 
    {
        "franchises": "numeric value"
    }

    If a value simply does not exist in the context data for Franchises for the year ${year}, return it with "-".

    Your response must only contain the JSON object only, we don't need any other text, only JSON with calculated values.

    Example:    
    {
        "franchises": "calculated value"
    }

    Provide only the JSON response. Keeping these instructions in mind, now start understanding the context data given below:
      
    Context data: ${basePrompt}.`;
  const column = { franchises: "-" };

  return { finalPrompt, column };
};

module.exports.generateFinalPromptForInvestments = (basePrompt, year) => {
  const finalPrompt = `
    Your job is to understand the context data I give and extract the values required out of it. This data is from a company's annual report filing. I will provide you with the data we need to export and for the year. You have to first understand the context data and then extract the required values out of it. These values are expected in their general unit, so if any calculation needs to be done, do it on your end.
    First we need to extract the values for Investments for the year ${year}. 
    
    Your output to this chat should only and only be a JSON object with the key as investments and the value which you have calculated. For example:
    GPT output would look like: 
    {
        "investments": "numeric value"
    }

    If a value simply does not exist in the context data for Investments for the year ${year}, return it with "-".

    Your response must only contain the JSON object only, we don't need any other text, only JSON with calculated values.

    Example:    
    {
        "investments": "calculated value"
    }

    Provide only the JSON response. Keeping these instructions in mind, now start understanding the context data given below:
      
    Context data: ${basePrompt}.`;
  const column = { scope_3_15_investments: "-" };

  return { finalPrompt, column };
};

module.exports.generateFinalPromptForScope1And2Combined = (
  basePrompt,
  year
) => {
  const finalPrompt = `
    Your job is to understand the context data I give and extract the values required out of it. This data is from a company's annual report filing. I will provide you with the data we need to export and for the year. You have to first understand the context data and then extract the required values out of it. These values are expected in their general unit, so if any calculation needs to be done, do it on your end.
    First we need to extract the values for Scope 1+2 (combined reporting) for the year ${year}. 
    
    Your output to this chat should only and only be a JSON object with the key as scope_1_2 and the value which you have calculated. For example:
    GPT output would look like: 
    {
        "scope_1_2": "numeric value"
    }

    If a value simply does not exist in the context data for Scope 1+2 (combined reporting) for the year ${year}, return it with "-".

    Your response must only contain the JSON object only, we don't need any other text, only JSON with calculated values.

    Example:    
    {
        "scope_1_2": "calculated value"
    }

    Provide only the JSON response. Keeping these instructions in mind, now start understanding the context data given below:
      
    Context data: ${basePrompt}.`;
  const column = { scope_1_2: "-" };

  return { finalPrompt, column };
};

module.exports.generateFinalPromptForScope1And2And3Combined = (
  basePrompt,
  year
) => {
  const finalPrompt = `
    Your job is to understand the context data I give and extract the values required out of it. This data is from a company's annual report filing. I will provide you with the data we need to export and for the year. You have to first understand the context data and then extract the required values out of it. These values are expected in their general unit, so if any calculation needs to be done, do it on your end.
    First we need to extract the values for Scope 1+2+3 (combined reporting) for the year ${year}. 
    
    Your output to this chat should only and only be a JSON object with the key as scope_1_2_3 and the value which you have calculated. For example:
    GPT output would look like: 
    {
        "scope_1_2_3": "numeric value"
    }

    If a value simply does not exist in the context data for Scope 1+2+3 (combined reporting) for the year ${year}, return it with "-".

    Your response must only contain the JSON object only, we don't need any other text, only JSON with calculated values.

    Example:    
    {
        "scope_1_2_3": "calculated value"
    }

    Provide only the JSON response. Keeping these instructions in mind, now start understanding the context data given below:
      
    Context data: ${basePrompt}.`;
  const column = { scope_1_2_3: "-" };

  return { finalPrompt, column };
};

module.exports.generateFinalPromptForBiogenicOutsideScopes = (
  basePrompt,
  year
) => {
  const finalPrompt = `
    Your job is to understand the context data I give and extract the values required out of it. This data is from a company's annual report filing. I will provide you with the data we need to export and for the year. You have to first understand the context data and then extract the required values out of it. These values are expected in their general unit, so if any calculation needs to be done, do it on your end.
    First we need to extract the values for Biogenic (outside of scopes) for the year ${year}. 
    
    Your output to this chat should only and only be a JSON object with the key as biogenic_outside_scopes and the value which you have calculated. For example:
    GPT output would look like: 
    {
        "biogenic_outside_scopes": "numeric value"
    }

    If a value simply does not exist in the context data for Biogenic (outside of scopes) for the year ${year}, return it with "-".

    Your response must only contain the JSON object only, we don't need any other text, only JSON with calculated values.

    Example:    
    {
        "biogenic_outside_scopes": "calculated value"
    }

    Provide only the JSON response. Keeping these instructions in mind, now start understanding the context data given below:
      
    Context data: ${basePrompt}.`;
  const column = { biogenic_outside_scopes: "-" };

  return { finalPrompt, column };
};

module.exports.generateFinalPromptForTotalEmissionsLocationOrMarket = (
  basePrompt,
  year
) => {
  const finalPrompt = `
    Your job is to understand the context data I give and extract the values required out of it. This data is from a company's annual report filing. I will provide you with the data we need to export and for the year. You have to first understand the context data and then extract the required values out of it. These values are expected in their general unit, so if any calculation needs to be done, do it on your end.
    First we need to extract the values for Total emissions (scope 1+2+3) location or market for the year ${year}. 
    
    Your output to this chat should only and only be a JSON object with the key as tot_1_2_3 and the value which you have calculated. For example:
    GPT output would look like: 
    {
        "tot_1_2_3": "numeric value"
    }

    If a value simply does not exist in the context data for Total emissions (scope 1+2+3) location or market for the year ${year}, return it with "-".

    Your response must only contain the JSON object only, we don't need any other text, only JSON with calculated values.

    Example:    
    {
        "tot_1_2_3": "calculated value"
    }

    Provide only the JSON response. Keeping these instructions in mind, now start understanding the context data given below:
      
    Context data: ${basePrompt}.`;
  const column = { tot_1_2_3: "-" };

  return { finalPrompt, column };
};
